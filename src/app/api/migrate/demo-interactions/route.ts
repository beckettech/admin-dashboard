import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS demo_interactions (
        id SERIAL PRIMARY KEY,
        lead_id VARCHAR(255) NOT NULL,
        business_name VARCHAR(255),
        interaction_type VARCHAR(50),
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_used_at TIMESTAMP`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_viewed_at TIMESTAMP`;

    return NextResponse.json({
      success: true,
      message: 'Added demo_interactions table and demo_used_at column to leads'
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
