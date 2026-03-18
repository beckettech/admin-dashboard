import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Insert initial leads
    await sql`
      INSERT INTO leads (id, business_name, owner_name, email, website, city, status, notes)
      VALUES 
        ('46e363db-c0cf-4035-a2de-5e7294eb18a8', 'Accurate Comfort Services', 'David Vergo', 'd.vergo@accuratecomfortservices.com', 'accuratecomfortservices.com', 'Naples', 'pitched', 'Email sent 2026-03-10. HVAC company, 4.8 stars, since 1975.'),
        ('bfb7261d-bb66-4b01-8db1-497721ccb95e', 'Complete Care Air', NULL, NULL, NULL, 'Houston', 'pitched', 'No email found - text only. 281 area code.')
      ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        owner_name = EXCLUDED.owner_name,
        email = EXCLUDED.email,
        website = EXCLUDED.website,
        city = EXCLUDED.city,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes
    `;

    // Insert demo views from history
    await sql`
      INSERT INTO demo_views (lead_id, business_name, website, demo_type, viewed_at)
      VALUES 
        ('46e363db-c0cf-4035-a2de-5e7294eb18a8', 'Accurate Comfort Services', 'accuratecomfortservices.com', 'webchat', NOW() - INTERVAL '1 day'),
        ('bfb7261d-bb66-4b01-8db1-497721ccb95e', 'Complete Care Air', '', 'webchat', NOW() - INTERVAL '2 days')
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Seed data inserted!',
      leads: ['accurate-comfort-services', 'complete-care-air']
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
