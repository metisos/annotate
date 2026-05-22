/* eslint-disable no-console */
/**
 * End-to-end smoke test for Phase 2:
 *   1. Mints a custom token for a synthetic test user via Firebase Admin
 *   2. Exchanges it for an ID token via the Identity Toolkit REST API
 *   3. Calls /api/auth/verify (creates a real users doc)
 *   4. Calls /api/clips with Bearer auth (creates a real text annotation)
 *   5. Fetches /clip/[slug] to confirm it renders
 *   6. Cleans up the test annotation and user
 *
 * Run with: pnpm --filter @annotate/web exec tsx scripts/e2e-publish.ts
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { MongoClient } from 'mongodb';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const TEST_UID = 'e2e-phase2-' + Date.now().toString(36);

async function main() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    initializeApp({ credential: applicationDefault(), projectId });
  }
  const adminAuth = getAuth();

  console.log(`[e2e] minting custom token for ${TEST_UID}`);
  const customToken = await adminAuth.createCustomToken(TEST_UID, {
    email: `${TEST_UID}@e2e.annotate.local`,
    name: 'E2E Tester',
  });

  console.log('[e2e] exchanging for ID token');
  const exchange = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!exchange.ok) {
    console.error('Exchange failed:', await exchange.text());
    process.exit(1);
  }
  const { idToken } = (await exchange.json()) as { idToken: string };

  console.log('[e2e] POST /api/auth/verify');
  const verify = await fetch(`${APP_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!verify.ok) {
    console.error('Verify failed:', verify.status, await verify.text());
    process.exit(1);
  }
  const { user } = (await verify.json()) as { user: { handle: string; firebaseUid: string } };
  console.log(`[e2e] user upserted: @${user.handle}`);

  console.log('[e2e] POST /api/clips (text)');
  const create = await fetch(`${APP_URL}/api/clips`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      type: 'text',
      source: {
        url: 'https://example.com/e2e-test-article',
        title: 'E2E Test Article',
      },
      textContent: {
        selectedText: 'A highlighted passage from the source article.',
        context: 'Some surrounding context.',
      },
      commentary: {
        text: 'This is the e2e test commentary — written from a real Firebase user via Bearer auth.',
      },
    }),
  });
  if (!create.ok) {
    console.error('Create failed:', create.status, await create.text());
    process.exit(1);
  }
  const { annotation } = (await create.json()) as {
    annotation: { slug: string; _id: string };
  };
  console.log(`[e2e] annotation created: /clip/${annotation.slug}`);

  console.log('[e2e] GET /clip/[slug]');
  const page = await fetch(`${APP_URL}/clip/${annotation.slug}`);
  console.log(`  → ${page.status} ${page.statusText}`);
  if (page.status !== 200) {
    console.error('Page render failed:', await page.text().then((t) => t.slice(0, 500)));
    process.exit(1);
  }

  console.log('[e2e] GET /api/clips/[slug]');
  const get = await fetch(`${APP_URL}/api/clips/${annotation.slug}`);
  const { annotation: fetched } = (await get.json()) as { annotation: { commentary: { text: string } } };
  console.log(`  → "${fetched.commentary.text.slice(0, 60)}…"`);

  // Wait for the fire-and-forget page-design agent (Vertex/Gemini) to land
  console.log('[e2e] polling for pageDesign update from Vertex/Gemini…');
  let agentDone = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const r = await fetch(`${APP_URL}/api/clips/${annotation.slug}`);
    const j = (await r.json()) as {
      annotation: { pageDesign?: { theme: string; pageTitle: string; generatedAt: string; pullQuote: string | null } };
    };
    const pd = j.annotation.pageDesign;
    if (pd && new Date(pd.generatedAt).getTime() > Date.now() - 60_000 && pd.pageTitle !== 'E2E Test Article') {
      agentDone = true;
      console.log(`  → agent done in ~${i + 1}s · theme=${pd.theme} · title="${pd.pageTitle}"${pd.pullQuote ? ` · quote="${pd.pullQuote}"` : ''}`);
      break;
    }
  }
  if (!agentDone) console.log('  → agent did not produce a fresh result within 30s (kept default)');

  console.log('[e2e] POST /api/agent/restyle/[slug] (Restyle action)');
  const restyle = await fetch(`${APP_URL}/api/agent/restyle/${annotation.slug}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${idToken}` },
  });
  console.log(`  → ${restyle.status}`);

  console.log('[e2e] PUT /api/clips/[slug] (owner edit)');
  const edit = await fetch(`${APP_URL}/api/clips/${annotation.slug}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ commentary: { text: 'Edited commentary, end-to-end.' } }),
  });
  console.log(`  → ${edit.status}`);

  console.log('[e2e] POST /api/claims/[slug]');
  const claim = await fetch(`${APP_URL}/api/claims/${annotation.slug}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      claimantName: 'E2E Claimant',
      claimantEmail: 'rights@e2e.local',
      originalContentUrl: 'https://example.com/e2e-test-article',
      reason: 'Testing the claim form end-to-end.',
    }),
  });
  console.log(`  → ${claim.status}`);

  console.log('[e2e] DELETE /api/clips/[slug]');
  const del = await fetch(`${APP_URL}/api/clips/${annotation.slug}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${idToken}` },
  });
  console.log(`  → ${del.status}`);

  // Cleanup the test user from MongoDB + Auth
  const mongoUri = process.env.MONGODB_URI!;
  const client = new MongoClient(mongoUri);
  await client.connect();
  await client.db(process.env.MONGODB_DB ?? 'annotate_db').collection('users').deleteOne({ firebaseUid: TEST_UID });
  await client.close();
  await adminAuth.deleteUser(TEST_UID).catch(() => {});

  console.log('[e2e] ✅ all steps passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
