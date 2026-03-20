import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const result = await sql`SELECT * FROM prospects ORDER BY created_at DESC`;
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prospects } = body;

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: 'No prospects provided' }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (const p of prospects) {
      try {
        const id = p.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
        
        // Check for duplicate by phone or company name
        const existing = await sql`
          SELECT id FROM prospects WHERE company_name = ${p.company_name} OR (phone IS NOT NULL AND phone = ${p.phone || null})
        `;
        
        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        await sql`
          INSERT INTO prospects (id, company_name, website, niche, location, rating, contact, email, phone, logo_url)
          VALUES (${id}, ${p.company_name}, ${p.website || null}, ${p.niche || null}, ${p.location || null}, ${p.rating || null}, ${p.contact || null}, ${p.email || null}, ${p.phone || null}, ${p.logo_url || null})
        `;
        imported++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
