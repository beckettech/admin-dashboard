import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await sql`
      SELECT
        id,
        prospect_id,
        company_name,
        phone,
        call_status,
        call_result,
        call_transcript,
        called_at
      FROM call_logs
      ORDER BY called_at DESC
      LIMIT 100
    `;
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
