import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function DELETE() {
  try {
    await sql`DELETE FROM prospects`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
