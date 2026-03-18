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
    let skipped = 0;

    for (const lead of leads) {
      try {
        const id = lead.lead_id || lead.business_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || Date.now().toString();

        if (!lead.business_name) { skipped++; continue; }

        const existing = await sql`SELECT id FROM leads WHERE id = ${id} OR business_name = ${lead.business_name}`;
        if (existing.rows.length > 0) { skipped++; continue; }

        await sql`
          INSERT INTO leads (id, business_name, owner_name, email, phone, status, notes)
          VALUES (${id}, ${lead.business_name}, ${lead.owner_name || lead.business_name}, ${lead.email || null}, ${lead.phone || null}, 'created', 'Imported from BotMockups')
        `;
        imported++;
      } catch { skipped++; }
    }

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
