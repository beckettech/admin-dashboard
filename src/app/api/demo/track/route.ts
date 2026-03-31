import { NextResponse } from 'next/server';
import { logDemoView, matchAndConsumeProspect } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lead, business, website, type, internal } = body;
    
    if (!lead) {
      return NextResponse.json({ error: 'Missing lead ID' }, { status: 400 });
    }
    
    // Skip tracking for internal views
    if (internal === true || internal === 'true') {
      return NextResponse.json({ success: true, skipped: true, reason: 'internal' });
    }
    
    // Also check referrer for internal param
    const referer = request.headers.get('referer') || '';
    if (referer.includes('internal=true')) {
      return NextResponse.json({ success: true, skipped: true, reason: 'internal' });
    }
    
    // Get client info for tracking
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    
    // Hash IP for privacy
    const ipHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(ip + process.env.IP_HASH_SALT || 'fastflow-salt')
    ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Fuzzy-match against prospects — if matched, consume the prospect
    const prospectMatch = await matchAndConsumeProspect(business || 'Unknown Business');

    // Log to database (with prospect data if matched)
    await logDemoView({
      lead_id: lead,
      business_name: business || 'Unknown Business',
      website: website || '',
      demo_type: type || 'webchat',
      ip_hash: ipHash.slice(0, 16),
      user_agent: userAgent.slice(0, 500),
      ...(prospectMatch.matched && prospectMatch.prospect ? {
        prospect_id: prospectMatch.prospect.id,
        prospect_phone: prospectMatch.prospect.phone || undefined,
        prospect_email: prospectMatch.prospect.email || undefined,
        prospect_contact: prospectMatch.prospect.contact || undefined,
        prospect_location: prospectMatch.prospect.location || undefined,
        prospect_niche: prospectMatch.prospect.niche || undefined,
      } : {}),
    });
    
    // Also send to Discord (notify in the specified channel)
    const discordWebhook = process.env.DISCORD_WEBHOOK_DEMO_VIEWS;
    if (discordWebhook) {
      const demoLink = `https://fastflow.bek-tech.com/api/demo?lead=${lead}&business=${encodeURIComponent(business || 'Unknown')}&website=${encodeURIComponent(website || '')}&type=${type || 'webchat'}`;
      const matched = prospectMatch.matched && prospectMatch.prospect;
      const fields = [
        { name: 'Business', value: business || 'Unknown', inline: true },
        { name: 'Type', value: type || 'webchat', inline: true },
        { name: 'Lead ID', value: lead || 'Unknown', inline: true },
        { name: 'Website', value: website ? `[${website}](${website})` : 'N/A', inline: false },
      ];
      if (matched) {
        if (matched.phone) fields.push({ name: '📞 Phone', value: matched.phone, inline: true });
        if (matched.email) fields.push({ name: '📧 Email', value: matched.email, inline: true });
        if (matched.contact) fields.push({ name: '👤 Contact', value: matched.contact, inline: true });
      }

      await fetch(discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: matched
            ? `🎯 **Prospect Matched & Demo Opened** — ${matched.company_name} viewed the demo!`
            : `🔍 **Demo Opened** — Check dashboard to categorize!`,
          embeds: [{
            title: `${business || 'Unknown Business'}`,
            url: demoLink,
            fields,
            color: matched ? 5763719 : 3447003, // green if matched, blue otherwise
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(err => console.error('Discord webhook error:', err));
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('demo/track error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
