import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';
import { users } from './mongo';
import type { User } from '@annotate/shared';

export const SESSION_COOKIE = '__annotate_session';
export const SESSION_LIFETIME_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function getSessionClaims() {
  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    return await adminAuth.verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const claims = await getSessionClaims();
  if (!claims) return null;
  const col = await users();
  return col.findOne({ firebaseUid: claims.uid });
}

export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

/**
 * Verify a request from either:
 *   - the web (session cookie set by /api/auth/verify), or
 *   - the extension (Authorization: Bearer <Firebase ID token>).
 * Returns the matching MongoDB user doc, or null.
 */
export async function getRequestUser(req: Request): Promise<User | null> {
  const cookieUser = await getSessionUser();
  if (cookieUser) return cookieUser;

  const authz = req.headers.get('authorization');
  if (!authz?.startsWith('Bearer ')) return null;
  const idToken = authz.slice(7).trim();
  if (!idToken) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const col = await users();
    return col.findOne({ firebaseUid: decoded.uid });
  } catch {
    return null;
  }
}

export async function requireRequestUser(req: Request): Promise<User> {
  const user = await getRequestUser(req);
  if (!user) throw new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), { status: 401 });
  return user;
}
