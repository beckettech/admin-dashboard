import { NextResponse } from 'next/server';
import { getAuthStatus } from '@/lib/auth';
import { getLeads, createLead, getLeadStats } from '@/lib/db';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  // Ensure facebook column exists
  try { await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS facebook TEXT`; } catch {}
  
  const authenticated = await getAuthStatus();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const stats = searchParams.get('stats') === 'true';
  
  if (stats) {
    const leadStats = await getLeadStats();
    return NextResponse.json(leadStats);
  }
  
  const leads = await getLeads(status);
  return NextResponse.json(leads);
}

export async function POST(request: Request) {
  const authenticated = await getAuthStatus();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    // Generate ID from business name if not provided
    const id = body.id || body.business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const lead = await createLead({ ...body, id });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Create lead error:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
