import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Add contacts JSON column to leads
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'`;
    // Add demo_url and channel if not already there
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_url TEXT`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS channel TEXT`;
    // Add demo_viewed_at if not already there
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_viewed_at TIMESTAMP`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_status TEXT`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS called_at TIMESTAMP`;
    return NextResponse.json({ success: true, message: 'leads.contacts + other columns ready' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
