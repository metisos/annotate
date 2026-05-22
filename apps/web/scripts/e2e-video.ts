/* eslint-disable no-console */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { MongoClient } from 'mongodb';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const TEST_UID = 'e2e-video-' + Date.now().toString(36);
// Test video supplied by the user
const SOURCE_URL = 'https://www.youtube.com/watch?v=ypHhsCRWnWs';

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_ADMIN_PROJECT_ID });
  }
  const adminAuth = getAuth();

  console.log('[e2e-video] minting test user');
  const customToken = await adminAuth.createCustomToken(TEST_UID, {
    email: `${TEST_UID}@e2e.annotate.local`,
    name: 'Video E2E',
  });
  const exchange = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const { idToken } = (await exchange.json()) as { idToken: string };

  await fetch(`${APP_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  console.log(`[e2e-video] POST /api/clips (video) range=5s..15s`);
  const t0 = Date.now();
  const create = await fetch(`${APP_URL}/api/clips`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      type: 'video',
      source: { url: SOURCE_URL, title: 'YouTube clip' },
      clip: { startTime: 5, endTime: 25 },
      commentary: { text: 'A 20-second clip pulled via the real E2B + yt-dlp + ffmpeg pipeline, transcoded to 240p, served from Firebase Storage.' },
    }),
  });
  if (!create.ok) {
    console.error('Create failed:', create.status, await create.text());
    process.exit(1);
  }
  const { annotation } = (await create.json()) as { annotation: { slug: string; status: string } };
  console.log(`  → annotation slug=${annotation.slug} status=${annotation.status}`);

  console.log('[e2e-video] polling until status=ready (max 3 min)');
  let final: { status: string; clip?: { mediaUrl?: string; thumbnailUrl?: string; duration?: number }; pageDesign?: { theme: string; pageTitle: string } } | null = null;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const r = await fetch(`${APP_URL}/api/clips/${annotation.slug}`);
    const j = (await r.json()) as { annotation: typeof final };
    final = j.annotation;
    if (final && (final.status === 'ready' || final.status === 'failed')) {
      console.log(`  → status=${final.status} after ${((i + 1) * 2)}s`);
      break;
    }
  }
  if (!final) {
    console.error('No status info returned');
    process.exit(1);
  }

  if (final.status === 'failed') {
    console.error('[e2e-video] ❌ pipeline reported failure — check dev server logs');
    process.exit(1);
  }

  console.log(`[e2e-video] mediaUrl=${final.clip?.mediaUrl}`);
  console.log(`[e2e-video] thumb   =${final.clip?.thumbnailUrl}`);
  console.log(`[e2e-video] duration=${final.clip?.duration}s`);
  console.log(`[e2e-video] total elapsed=${Math.round((Date.now() - t0) / 1000)}s`);

  if (final.clip?.mediaUrl) {
    const head = await fetch(final.clip.mediaUrl, { method: 'HEAD' });
    console.log(`[e2e-video] HEAD ${head.status} ${head.headers.get('content-type')} ${head.headers.get('content-length')}B`);
  }

  if (final.pageDesign) {
    console.log(
      `[e2e-video] page-design done · theme=${final.pageDesign.theme} title="${final.pageDesign.pageTitle}"`,
    );
  }

  console.log(`[e2e-video] ✅ live at ${APP_URL}/clip/${annotation.slug}`);
  console.log('[e2e-video] (test data left in DB so you can view it; rerun with CLEANUP=1 to delete)');

  if (process.env.CLEANUP === '1') {
    const mongo = new MongoClient(process.env.MONGODB_URI!);
    await mongo.connect();
    await mongo.db(process.env.MONGODB_DB ?? 'annotate_db').collection('annotations').deleteOne({ slug: annotation.slug });
    await mongo.db(process.env.MONGODB_DB ?? 'annotate_db').collection('users').deleteOne({ firebaseUid: TEST_UID });
    await mongo.close();
    await adminAuth.deleteUser(TEST_UID).catch(() => {});
    console.log('[e2e-video] test data cleaned up');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
