import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, verifyIdToken } from '@/lib/firebase-admin';
import { users } from '@/lib/mongo';
import { pickAvailableHandle } from '@/lib/handles';
import { SESSION_COOKIE, SESSION_LIFETIME_MS } from '@/lib/auth';

export async function POST(req: Request) {
  const { idToken } = (await req.json()) as { idToken?: string };
  if (!idToken) return NextResponse.json({ error: 'idToken required' }, { status: 400 });

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_LIFETIME_MS,
  });

  const col = await users();
  let user = await col.findOne({ firebaseUid: decoded.uid });

  if (!user) {
    const now = new Date();
    const handleSeed = decoded.email?.split('@')[0] ?? decoded.name ?? decoded.uid;
    const handle = await pickAvailableHandle(col, handleSeed);
    const doc = {
      firebaseUid: decoded.uid,
      provider: 'google' as const,
      displayName: decoded.name ?? handle,
      handle,
      avatarUrl: decoded.picture,
      followerCount: 0,
      followingCount: 0,
      annotationCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const insert = await col.insertOne(doc);
    user = { ...doc, _id: insert.insertedId.toString() };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_LIFETIME_MS / 1000,
  });

  return NextResponse.json({ user });
}
