import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
  try {
    // Add niche column if not exists
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS niche VARCHAR(50)`;

    // Auto-assign niche based on business name
    const niches: Record<string, string[]> = {
      hvac: ['hvac', 'air conditioning', 'heating', 'cooling', 'ac', 'ventilation', 'air duct', 'climate control', 'conditioning', 'air conditioner', 'furnace', 'heat pump'],
      plumbing: ['plumbing', 'plumber', 'plumbers', 'pipe', 'drain', 'sewer', 'water heater', 'bathroom', 'toilet', 'leak', 'drainage', 'septic', 'water'],
      electrical: ['electrical', 'electrician', 'electric', 'wire', 'circuit', 'panel', 'lighting', 'electricity'],
      roofing: ['roofing', 'roof', 'shingle', 'gutter', 'siding', 'roofer'],
      dental: ['dental', 'dentist', 'orthodontist', 'teeth'],
      restaurant: ['restaurant', 'catering', 'food', 'cafe', 'diner', 'grill'],
      salon: ['salon', 'spa', 'barber', 'hair', 'nail', 'beauty', 'hair salon'],
      'realestate': ['real estate', 'realtor', 'property', 'apartment', 'condo'],
    };

    const leads = await sql`SELECT id, business_name, niche FROM leads`;
    let updated = 0;

    for (const lead of leads.rows) {
      if (lead.niche) continue; // Skip if already has niche

      const name = (lead.business_name || '').toLowerCase();
      let assignedNiche = null;

      for (const [niche, keywords] of Object.entries(niches)) {
        if (keywords.some(kw => name.includes(kw))) {
          assignedNiche = niche;
          break;
        }
      }

      if (assignedNiche) {
        await sql`UPDATE leads SET niche = ${assignedNiche} WHERE id = ${lead.id}`;
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Added niche column and auto-assigned ${updated} leads`,
      updated,
      totalLeads: leads.rows.length,
    });
  } catch (error) {
    console.error('Niche migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
