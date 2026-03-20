import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Add demo_url and channel columns to leads table if they don't exist
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_url TEXT`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS channel TEXT`;
    return NextResponse.json({ success: true, message: 'Columns demo_url and channel added to leads table' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
