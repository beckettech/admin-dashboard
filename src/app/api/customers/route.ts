import { NextResponse } from 'next/server';
import { getAuthStatus } from '@/lib/auth';
import { getCustomers } from '@/lib/db';

export async function GET() {
  const authenticated = await getAuthStatus();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const customers = await getCustomers();
  return NextResponse.json(customers);
}
