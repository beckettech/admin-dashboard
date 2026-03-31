import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Normalize business name for matching
function normalize(name: string): string {
  const suffixes = ['inc', 'llc', 'corp', 'corporation', 'co', 'company', 'ltd', 'limited', 'services', 'service'];
  let normalized = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')  // Remove all non-alphanumeric
    .trim();
  
  // Strip common suffixes
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length + 3) {
      normalized = normalized.slice(0, -suffix.length);
    }
  }
  
  return normalized;
}

export async function POST() {
  try {
    // Get all leads and prospects
    const leadsResult = await sql`SELECT id, business_name, phone FROM leads`;
    const prospectsResult = await sql`SELECT id, company_name, phone FROM prospects`;

    const leads = leadsResult.rows;
    const prospects = prospectsResult.rows;

    const merged: string[] = [];
    const skipped: string[] = [];
    const debug: string[] = [];

    for (const prospect of prospects) {
      const pNorm = normalize(prospect.company_name);
      const pPhone = prospect.phone || '';

      // Find matching lead by normalized name or phone
      const match = leads.find(l => {
        const lNorm = normalize(l.business_name);
        const lPhone = l.phone || '';
        const nameMatch = lNorm === pNorm;
        const phoneMatch = pPhone && lPhone && pPhone === lPhone;
        
        // Debug log
        if (pNorm.includes('dolphin') || lNorm.includes('dolphin')) {
          debug.push(`Prospect: '${prospect.company_name}' (${pNorm}) vs Lead: '${l.business_name}' (${lNorm}) - name:${nameMatch} phone:${phoneMatch}`);
        }
        
        return nameMatch || phoneMatch;
      });

      if (match) {
        // Get full prospect data
        const fullProspect = await sql`SELECT * FROM prospects WHERE id = ${prospect.id}`;

        if (fullProspect.rows.length > 0) {
          const p = fullProspect.rows[0];

          // Merge prospect fields into lead
          await sql`
            UPDATE leads SET
              phone = COALESCE(phone, ${p.phone}),
              website = COALESCE(website, ${p.website}),
              city = COALESCE(city, ${p.location}),
              call_status = COALESCE(call_status, ${p.call_status}),
              called_at = COALESCE(called_at, ${p.called_at}),
              niche = COALESCE(niche, ${p.niche})
            WHERE id = ${match.id}
          `;

          // Delete the prospect
          await sql`DELETE FROM prospects WHERE id = ${prospect.id}`;

          merged.push(`${prospect.company_name} → ${match.business_name}`);
        }
      } else {
        skipped.push(prospect.company_name);
      }
    }

    return NextResponse.json({
      success: true,
      merged: merged.length,
      skipped: skipped.length,
      details: { merged, skipped, debug, leadsCount: leads.length, prospectsCount: prospects.length }
    });
  } catch (error) {
    console.error('Merge error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
