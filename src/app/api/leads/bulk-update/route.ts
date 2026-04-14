import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Auto-assign niche to all leads
export async function POST() {
  try {
    const niches: Record<string, string[]> = {
      plumbing: ['plumbing', 'plumber', 'plumbers', 'pipe', 'drain', 'sewer', 'water heater', 'bathroom', 'toilet', 'leak', 'drainage', 'septic', 'rooter'],
      hvac: ['hvac', 'air conditioning', 'heating', 'cooling', 'ac repair', 'ac service', 'ventilation', 'air duct', 'climate control', 'air conditioner', 'furnace', 'heat pump', ' ac '],
      electrical: ['electrical', 'electrician', 'electric', 'wire', 'circuit', 'panel', 'lighting', 'electricity'],
      roofing: ['roofing', 'roof', 'shingle', 'gutter', 'siding', 'roofer'],
      dental: ['dental', 'dentist', 'orthodontist', 'teeth'],
      restaurant: ['restaurant', 'restaur', 'catering', 'food', 'cafe', 'diner', 'grill', 'pizza', 'burger', 'taco', 'sushi', 'bakery', 'bistro', 'kitchen', 'bbq', 'wing'],
      salon: ['salon', 'spa', 'barber', 'hair', 'nail', 'beauty', 'hair salon'],
      'realestate': ['real estate', 'realtor', 'property', 'realty', 'properties'],
      lawncare: ['lawn care', 'lawn', 'landscaping', 'landscape', 'yard', 'mowing', 'turf', 'grounds maintenance', 'garden'],
      contractor: ['contractor', 'contractors', 'construction', 'builder', 'remodel', 'renovation', 'general contractor'],
      cardetail: ['detailing', 'detail', 'auto spa', 'car wash', 'ceramic coating', 'window tint', 'paint correction', 'car care', 'mobile detail'],
      pestcontrol: ['pest control', 'pest', 'exterminator', 'exterminating', 'termite', 'rodent', 'bug', 'insect', 'mosquito control', 'wildlife removal'],
    };

    const leads = await sql`SELECT id, business_name, niche FROM leads`;
    let updated = 0;

    for (const lead of leads.rows) {
      const name = (lead.business_name || '').toLowerCase();
      let assignedNiche = null;

      for (const [niche, keywords] of Object.entries(niches)) {
        if (keywords.some(kw => name.includes(kw))) {
          assignedNiche = niche;
          break;
        }
      }

      // Only update if niche changed or not set
      if (assignedNiche !== lead.niche) {
        await sql`UPDATE leads SET niche = ${assignedNiche} WHERE id = ${lead.id}`;
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      totalLeads: leads.rows.length,
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
