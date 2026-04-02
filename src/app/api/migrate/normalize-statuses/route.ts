import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
  try {
    // Status normalization map
    const STATUS_MAP: Record<string, string> = {
      'found': 'created',
      'building': 'created',
      'draft': 'created',
      'approved': 'sent',
      'pitched': 'opened',
      'responded': 'followed_up',
      'closed': 'sold',
      'passed': 'not_interested',
      'archived': 'not_interested',
    };

    // Get all leads with non-standard statuses
    const leads = await sql`SELECT id, status FROM leads`;
    let updated = 0;
    const changes: { id: string; from: string; to: string }[] = [];

    for (const lead of leads.rows) {
      const currentStatus = lead.status || 'created';
      const normalized = STATUS_MAP[currentStatus] || currentStatus;

      if (currentStatus !== normalized) {
        await sql`UPDATE leads SET status = ${normalized} WHERE id = ${lead.id}`;
        changes.push({ id: lead.id, from: currentStatus, to: normalized });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Normalized ${updated} lead statuses`,
      updated,
      changes,
    });
  } catch (error) {
    console.error('Normalize statuses error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
