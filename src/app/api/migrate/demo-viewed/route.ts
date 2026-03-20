import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_viewed_at TIMESTAMP`;
    return NextResponse.json({ success: true, message: 'Added demo_viewed_at column to leads table' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
