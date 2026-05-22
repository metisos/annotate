/* eslint-disable no-console */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { MongoClient } from 'mongodb';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const TEST_UID = 'e2e-ai-' + Date.now().toString(36);

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_ADMIN_PROJECT_ID });
  }
  const adminAuth = getAuth();

  const customToken = await adminAuth.createCustomToken(TEST_UID, {
    email: `${TEST_UID}@e2e.annotate.local`,
    name: 'AI Assist E2E',
  });
  const ex = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const { idToken } = (await ex.json()) as { idToken: string };
  await fetch(`${APP_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const SELECTED =
    'Inflation expectations have re-anchored at 2.4% per the New York Fed survey, the lowest reading since the post-pandemic spike. Goods inflation is firmly back below pre-COVID norms; the stickiness is now isolated in shelter and services.';
  const SOURCE_URL = 'https://example.com/ny-fed-inflation-expectations';

  console.log('[ai-e2e] POST /api/agent/draft-preview (pre-publish)');
  const t0 = Date.now();
  const draftRes = await fetch(`${APP_URL}/api/agent/draft-preview`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      source: { url: SOURCE_URL, title: 'NY Fed survey — inflation expectations re-anchor' },
      selectedText: SELECTED,
    }),
  });
  if (!draftRes.ok) {
    console.error('draft-preview failed:', draftRes.status, await draftRes.text());
    process.exit(1);
  }
  const { draft } = (await draftRes.json()) as { draft: { draftText: string; suggestedTags: string[]; keyClaims: string[] } };
  console.log(`  → draft in ${Date.now() - t0}ms`);
  console.log(`  draftText: "${draft.draftText.slice(0, 200)}…"`);
  console.log(`  tags: ${JSON.stringify(draft.suggestedTags)}`);
  console.log(`  claims: ${draft.keyClaims.length}`);

  console.log('[ai-e2e] POST /api/clips (text + aiGenerated)');
  const create = await fetch(`${APP_URL}/api/clips`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      type: 'text',
      source: { url: SOURCE_URL, title: 'NY Fed survey — inflation expectations re-anchor' },
      textContent: { selectedText: SELECTED },
      commentary: { text: draft.draftText, aiGenerated: true },
    }),
  });
  const { annotation } = (await create.json()) as { annotation: { slug: string } };
  console.log(`  → slug=${annotation.slug}`);

  console.log('[ai-e2e] polling for enrichment.sources from grounded Gemini…');
  let ann: { enrichment?: { sources: unknown[]; summary?: string } } | null = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const r = await fetch(`${APP_URL}/api/clips/${annotation.slug}`);
    const j = (await r.json()) as { annotation: typeof ann };
    ann = j.annotation;
    if (ann?.enrichment) break;
  }
  if (!ann?.enrichment) {
    console.log('  → no enrichment within 45s');
  } else {
    console.log(`  → enrichment with ${ann.enrichment.sources.length} sources`);
    console.log(`  summary: "${ann.enrichment.summary ?? ''}"`);
    for (const s of ann.enrichment.sources.slice(0, 4)) {
      const ss = s as { relationship: string; title: string; url: string };
      console.log(`    [${ss.relationship}] ${ss.title} — ${ss.url}`);
    }
  }

  console.log(`[ai-e2e] ✅ live at ${APP_URL}/clip/${annotation.slug}`);

  if (process.env.CLEANUP === '1') {
    const mongo = new MongoClient(process.env.MONGODB_URI!);
    await mongo.connect();
    await mongo.db(process.env.MONGODB_DB ?? 'annotate_db').collection('annotations').deleteOne({ slug: annotation.slug });
    await mongo.db(process.env.MONGODB_DB ?? 'annotate_db').collection('users').deleteOne({ firebaseUid: TEST_UID });
    await mongo.close();
    await adminAuth.deleteUser(TEST_UID).catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
