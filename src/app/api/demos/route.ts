import { NextResponse } from 'next/server';
import { getAuthStatus } from '@/lib/auth';
import { getDemoViews, getDemoViewStats } from '@/lib/db';

export async function GET(request: Request) {
  const authenticated = await getAuthStatus();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const stats = searchParams.get('stats') === 'true';
  
  if (stats) {
    const viewStats = await getDemoViewStats();
    return NextResponse.json(viewStats);
  }
  
  const views = await getDemoViews(limit, offset);
  return NextResponse.json(views);
}
