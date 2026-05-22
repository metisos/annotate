import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import { SESSION_COOKIE } from '@/lib/auth';

export async function POST() {
  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE)?.value;
  if (cookie) {
    try {
      const claims = await adminAuth.verifySessionCookie(cookie);
      await adminAuth.revokeRefreshTokens(claims.sub);
    } catch {
      // already invalid — fall through and clear
    }
  }
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
