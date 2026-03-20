import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Get leads that need after-hours checking
export async function GET() {
  try {
    // Add call_status column if not exists
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_status VARCHAR(20) DEFAULT 'uncalled'`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS called_at TIMESTAMP`;
    
    // Get leads with phone numbers that haven't been called yet
    const result = await sql`
      SELECT id, business_name, phone, city 
      FROM leads 
      WHERE phone IS NOT NULL 
        AND phone != ''
        AND (call_status IS NULL OR call_status = 'uncalled')
        AND status IN ('created', 'sent', 'opened')
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    return NextResponse.json({
      success: true,
      leads: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching leads for calling:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
