import { NextResponse } from 'next/server';
import { getAuthStatus } from '@/lib/auth';

export async function GET() {
  const authenticated = await getAuthStatus();
  return NextResponse.json({ authenticated });
}
