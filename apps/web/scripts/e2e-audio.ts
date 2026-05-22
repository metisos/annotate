/* eslint-disable no-console */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { MongoClient } from 'mongodb';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const TEST_UID = 'e2e-audio-' + Date.now().toString(36);
const SOURCE_URL = process.env.AUDIO_URL ?? 'https://www.youtube.com/watch?v=ypHhsCRWnWs';

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_ADMIN_PROJECT_ID });
  }
  const ct = await getAuth().createCustomToken(TEST_UID, {
    email: `${TEST_UID}@e2e.local`,
    name: 'Audio E2E',
  });
  const ex = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: ct, returnSecureToken: true }),
    },
  );
  const { idToken } = (await ex.json()) as { idToken: string };
  await fetch(`${APP_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  console.log(`[audio] POST /api/clips (audio) range=10s..30s`);
  const t0 = Date.now();
  const create = await fetch(`${APP_URL}/api/clips`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      type: 'audio',
      source: { url: SOURCE_URL, title: 'Audio E2E clip' },
      clip: { startTime: 10, endTime: 30 },
      commentary: { text: 'A 20-second audio extract from the source video, via the real E2B audio pipeline.' },
    }),
  });
  if (!create.ok) {
    console.error('Create failed:', create.status, await create.text());
    process.exit(1);
  }
  const { annotation } = (await create.json()) as { annotation: { slug: string } };
  console.log(`  → slug=${annotation.slug}`);

  console.log('[audio] polling for ready (max 3 min)');
  let final: { status: string; clip?: { mediaUrl?: string; duration?: number } } | null = null;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const r = await fetch(`${APP_URL}/api/clips/${annotation.slug}`);
    const j = (await r.json()) as { annotation: typeof final };
    final = j.annotation;
    if (final && (final.status === 'ready' || final.status === 'failed')) {
      console.log(`  → status=${final.status} after ${(i + 1) * 2}s`);
      break;
    }
  }
  if (!final || final.status !== 'ready') {
    console.error('audio pipeline did not reach ready', final?.status);
    process.exit(1);
  }

  console.log(`[audio] mediaUrl=${final.clip?.mediaUrl}`);
  if (final.clip?.mediaUrl) {
    const head = await fetch(final.clip.mediaUrl, { method: 'HEAD' });
    console.log(`[audio] HEAD ${head.status} ${head.headers.get('content-type')} ${head.headers.get('content-length')}B`);
  }
  console.log(`[audio] total elapsed=${Math.round((Date.now() - t0) / 1000)}s`);
  console.log(`[audio] ✅ live at ${APP_URL}/clip/${annotation.slug}`);

  if (process.env.CLEANUP === '1') {
    const mongo = new MongoClient(process.env.MONGODB_URI!);
    await mongo.connect();
    await mongo.db(process.env.MONGODB_DB ?? 'annotate_db').collection('annotations').deleteOne({ slug: annotation.slug });
    await mongo.db(process.env.MONGODB_DB ?? 'annotate_db').collection('users').deleteOne({ firebaseUid: TEST_UID });
    await mongo.close();
    await getAuth().deleteUser(TEST_UID).catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
