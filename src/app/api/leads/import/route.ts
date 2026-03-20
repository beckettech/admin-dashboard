import { NextResponse } from 'next/server';
import { getAuthStatus } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  const authenticated = await getAuthStatus();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { leads } = await request.json();

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

    for (const lead of leads) {
      try {
        // Generate ID from business_name if not provided
        const businessName = lead.business_name?.trim() || 'Unknown Business';
        const id = lead.lead_id || businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || Date.now().toString();

        // Check if already exists in leads table
        const existing = await sql`SELECT * FROM leads WHERE id = ${id} OR business_name = ${businessName}`;

        if (existing.rows.length > 0) {
          const existingLead = existing.rows[0];

          // Check if this company exists in prospects table and merge info
          const prospect = await sql`SELECT * FROM prospects WHERE company_name = ${businessName} LIMIT 1`;

          const updateData: Record<string, string> = {};
          if (prospect.rows.length > 0) {
            const prospectInfo = prospect.rows[0];
            if (prospectInfo.contact && !existingLead.owner_name) updateData.owner_name = prospectInfo.contact;
            if (prospectInfo.email && !existingLead.email) updateData.email = prospectInfo.email;
            if (prospectInfo.phone && !existingLead.phone) updateData.phone = prospectInfo.phone;
            if (prospectInfo.website && !existingLead.website) updateData.website = prospectInfo.website;
            if (prospectInfo.niche && !existingLead.notes) updateData.notes = `Niche: ${prospectInfo.niche}`;
          }

          // Update if we have new data, otherwise skip
          if (Object.keys(updateData).length > 0) {
            const setClause = Object.entries(updateData).map(([k], i) => `${k} = $${i + 2}`).join(', ');
            await sql`
              UPDATE leads
              SET ${setClause}, updated_at = NOW()
              WHERE id = ${id}
            `;
            updated++;
          } else {
            // Already exists and no new data - skip
            continue;
          }
        } else {
          // New lead - insert
          await sql`
            INSERT INTO leads (id, business_name, owner_name, email, phone, status, notes)
            VALUES (${id}, ${businessName}, ${lead.owner_name || lead.business_name}, ${lead.email || null}, ${lead.phone || null}, 'created', 'Imported from BotMockups')
          `;
          imported++;
        }
      } catch (error) {
        console.error('Import error for lead:', lead.business_name, error);
      }
    }

    return NextResponse.json({ imported, updated, merged: imported + updated });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
