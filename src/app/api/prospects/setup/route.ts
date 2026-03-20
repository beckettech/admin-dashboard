import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Create prospects table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS prospects (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        website TEXT,
        niche TEXT,
        location TEXT,
        rating TEXT,
        contact TEXT,
        email TEXT,
        phone TEXT,
        logo_url TEXT,
        call_status TEXT DEFAULT 'uncalled',
        call_result TEXT,
        called_at TIMESTAMP,
        scheduled_call_time TIMESTAMP,
        call_transcript TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS call_transcript TEXT`;
    await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS call_result TEXT`;
    await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS scheduled_call_time TIMESTAMP`;

    return NextResponse.json({ success: true, message: 'Prospects table ready' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
