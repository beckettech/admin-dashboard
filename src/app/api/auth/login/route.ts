import { NextResponse } from 'next/server';
import { login, AUTH_COOKIE_OPTIONS } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const result = await login(password);
    
    if (result.success && result.token) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('admin_session', result.token, AUTH_COOKIE_OPTIONS);
      return response;
    }
    
    return NextResponse.json(result, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
