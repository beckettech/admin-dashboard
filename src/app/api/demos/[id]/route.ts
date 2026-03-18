import { NextResponse } from 'next/server';
import { getAuthStatus } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await getAuthStatus();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await sql`DELETE FROM demo_views WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete demo view error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
