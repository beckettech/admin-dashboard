import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { call_status, call_result, call_transcript, scheduled_call_time, notes } = body;

    await sql`
      UPDATE prospects SET
        call_status = COALESCE(${call_status || null}, call_status),
        call_result = COALESCE(${call_result || null}, call_result),
        call_transcript = COALESCE(${call_transcript || null}, call_transcript),
        scheduled_call_time = COALESCE(${scheduled_call_time || null}::timestamp, scheduled_call_time),
        notes = COALESCE(${notes || null}, notes),
        called_at = CASE WHEN ${call_status || null} IN ('human', 'voicemail', 'no_answer') THEN NOW() ELSE called_at END
      WHERE id = ${id}
    `;

    const result = await sql`SELECT * FROM prospects WHERE id = ${id}`;
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await sql`DELETE FROM prospects WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
