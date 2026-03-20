import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create call_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS call_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
        company_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        call_status TEXT NOT NULL,
        call_result TEXT,
        call_transcript TEXT,
        called_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_call_logs_called_at ON call_logs(called_at DESC)
    `;

    return NextResponse.json({ success: true, message: 'Call logs table created' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
