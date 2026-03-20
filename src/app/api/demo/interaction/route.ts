import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lead, business, interaction_type, content, internal } = body;

    if (!lead) {
      return NextResponse.json({ error: 'Missing lead ID' }, { status: 400 });
    }

    // Skip tracking for internal views
    if (internal === true || internal === 'true') {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Log interaction
    await sql`
      INSERT INTO demo_interactions (lead_id, business_name, interaction_type, content)
      VALUES (${lead}, ${business || 'Unknown'}, ${interaction_type || 'unknown'}, ${content || null})
    `;

    // Update lead status to 'used' if not already
    await sql`
      UPDATE leads
      SET status = 'used', demo_used_at = NOW()
      WHERE id = ${lead} AND status != 'used'
    `;

    // Discord notification
    const discordWebhook = process.env.DISCORD_WEBHOOK_DEMO_VIEWS;
    if (discordWebhook) {
      await fetch(discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `<#1481014187915477082> 🎯 **Demo Used** — ${business || 'Unknown Business'} interacted with the demo!`,
          embeds: [{
            title: `${business || 'Unknown Business'}`,
            fields: [
              { name: 'Interaction', value: interaction_type || 'Unknown', inline: true },
              { name: 'Lead ID', value: lead, inline: true },
              { name: 'Content', value: content || 'N/A', inline: false }
            ],
            color: 15844367,
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(err => console.error('Discord webhook error:', err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('demo/interaction error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
