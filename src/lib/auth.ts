import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fastflow-admin-secret-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fastflow2024';

export interface AdminSession {
  authenticated: boolean;
  iat: number;
  exp: number;
}

export function createSession(): string {
  return jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifySession(token: string): AdminSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminSession;
  } catch {
    return null;
  }
}

export async function getAuthStatus(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return false;
  const session = verifySession(token);
  return session?.authenticated ?? false;
}

export function login(password: string): { success: boolean; token?: string; error?: string } {
  if (password === ADMIN_PASSWORD) {
    const token = createSession();
    return { success: true, token };
  }
  return { success: false, error: 'Invalid password' };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
}

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};
