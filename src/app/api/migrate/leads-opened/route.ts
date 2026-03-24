import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
  try {
    const leads = await sql`
      SELECT id, business_name, demo_url
      FROM leads
      WHERE demo_url LIKE '%/%'
      LIMIT 50
    `;

    let updated = 0;
    const results = [];

    for (const lead of leads.rows) {
      const match = lead.demo_url?.match(/\/demo\/([a-f0-9-]{36})/);
      if (match) {
        const leadId = match[1];
        const result = await sql`
          UPDATE leads
          SET status = 'opened', demo_viewed_at = NOW()
          WHERE id = ${leadId}
            AND status NOT IN ('opened', 'used', 'followed_up', 'not_interested', 'sold')
        `;
        if (result.rowCount && result.rowCount > 0) {
          updated++;
          results.push({ id: lead.id, business: lead.business_name, statusUpdated: true });
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalScanned: leads.rows.length,
      updated: updated,
      results: results
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
