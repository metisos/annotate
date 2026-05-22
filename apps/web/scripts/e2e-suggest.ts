/* eslint-disable no-console */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const TEST_UID = 'e2e-suggest-' + Date.now().toString(36);
const YOUTUBE_URL = process.env.SUGGEST_URL ?? 'https://www.youtube.com/watch?v=ypHhsCRWnWs';

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_ADMIN_PROJECT_ID });
  }
  const ct = await getAuth().createCustomToken(TEST_UID, {
    email: `${TEST_UID}@e2e.local`,
    name: 'Suggest E2E',
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

  console.log(`[suggest] POST /api/agent/suggest for ${YOUTUBE_URL}`);
  const t0 = Date.now();
  const res = await fetch(`${APP_URL}/api/agent/suggest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ youtubeUrl: YOUTUBE_URL }),
  });
  if (!res.ok) {
    console.error(`  status=${res.status} body=${await res.text()}`);
    process.exit(1);
  }
  const { moments } = (await res.json()) as { moments: Array<{ startTime: number; endTime: number; label: string }> };
  console.log(`  → ${moments.length} moments in ${Date.now() - t0}ms`);
  for (const m of moments) {
    console.log(`    ${fmt(m.startTime)} → ${fmt(m.endTime)} (${m.endTime - m.startTime}s) — ${m.label}`);
  }
  console.log('[suggest] ✅');
}

function fmt(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
