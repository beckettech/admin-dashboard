import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Public endpoint for initial migration
export async function GET() {

  try {
    // Add new columns
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS text_sent BOOLEAN DEFAULT FALSE`;
    
    // Migrate old statuses to new pipeline stages
    await sql`
      UPDATE leads SET status = 'created' WHERE status IN ('found', 'building', 'draft')
    `;
    await sql`
      UPDATE leads SET status = 'sent' WHERE status = 'approved'
    `;
    await sql`
      UPDATE leads SET status = 'opened' WHERE status = 'pitched'
    `;
    await sql`
      UPDATE leads SET status = 'followed_up' WHERE status = 'responded'
    `;
    await sql`
      UPDATE leads SET status = 'not_interested' WHERE status = 'passed'
    `;
    
    // Get counts by new status
    const result = await sql`
      SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC
    `;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration complete!',
      statuses: result.rows
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
