import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS blocked_callers (phone TEXT PRIMARY KEY, reason TEXT, blocked_at TIMESTAMPTZ DEFAULT NOW())`;
}

export async function GET(request: Request) {
  await ensureTable();
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');

  if (phone) {
    // Single phone check — used by voice webhook
    const r = await sql`SELECT phone FROM blocked_callers WHERE phone = ${phone}`;
    return NextResponse.json({ blocked: r.rows.length > 0 });
  }

  const r = await sql`SELECT * FROM blocked_callers ORDER BY blocked_at DESC`;
  return NextResponse.json({ blocked: r.rows });
}

export async function POST(request: Request) {
  await ensureTable();
  const { phone, reason } = await request.json();
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });
  await sql`INSERT INTO blocked_callers (phone, reason) VALUES (${phone}, ${reason || 'Manually blocked'}) ON CONFLICT (phone) DO UPDATE SET reason = EXCLUDED.reason, blocked_at = NOW()`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await ensureTable();
  const { phone } = await request.json();
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });
  await sql`DELETE FROM blocked_callers WHERE phone = ${phone}`;
  return NextResponse.json({ ok: true });
}
