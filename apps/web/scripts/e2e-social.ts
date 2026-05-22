/* eslint-disable no-console */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { MongoClient } from 'mongodb';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const RUN = Date.now().toString(36);
const ALICE = 'e2e-social-alice-' + RUN;
const BOB = 'e2e-social-bob-' + RUN;

async function tokenFor(uid: string, name: string) {
  const ct = await getAuth().createCustomToken(uid, { email: `${uid}@e2e.local`, name });
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: ct, returnSecureToken: true }),
    },
  );
  const { idToken } = (await r.json()) as { idToken: string };
  const verify = await fetch(`${APP_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const { user } = (await verify.json()) as { user: { handle: string } };
  return { idToken, handle: user.handle };
}

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_ADMIN_PROJECT_ID });
  }

  console.log('[social] minting Alice + Bob');
  const alice = await tokenFor(ALICE, 'Alice');
  const bob = await tokenFor(BOB, 'Bob');
  console.log(`  alice=@${alice.handle} bob=@${bob.handle}`);

  console.log('[social] Alice publishes a text annotation');
  const pub = await fetch(`${APP_URL}/api/clips`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${alice.idToken}` },
    body: JSON.stringify({
      type: 'text',
      source: { url: `https://example.com/social-test-${RUN}`, title: 'Social test article' },
      textContent: { selectedText: 'A passage that Alice highlighted from a real article.' },
      commentary: { text: 'My take on the passage above.' },
    }),
  });
  const { annotation } = (await pub.json()) as { annotation: { slug: string } };
  console.log(`  → /clip/${annotation.slug}`);

  console.log('[social] Bob follows Alice');
  const follow = await fetch(`${APP_URL}/api/follow/${alice.handle}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${bob.idToken}` },
  });
  console.log(`  → POST follow: ${follow.status} ${(await follow.json()).following}`);

  console.log('[social] Bob hits /api/feed/following');
  const feed = await fetch(`${APP_URL}/api/feed/following`, {
    headers: { authorization: `Bearer ${bob.idToken}` },
  });
  const { clips } = (await feed.json()) as { clips: { slug: string }[] };
  console.log(`  → ${clips.length} clips; first=${clips[0]?.slug}`);
  if (!clips.some((c) => c.slug === annotation.slug)) {
    console.error("  ❌ Alice's clip not in Bob's following feed");
    process.exit(1);
  }

  console.log('[social] Bob comments on the annotation');
  const cmt = await fetch(`${APP_URL}/api/comments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${bob.idToken}` },
    body: JSON.stringify({ slug: annotation.slug, text: "Hard agree on the structural read." }),
  });
  console.log(`  → POST comment: ${cmt.status}`);

  console.log('[social] Read comments back');
  const ann = await fetch(`${APP_URL}/api/clips/${annotation.slug}`);
  const { annotation: full } = (await ann.json()) as { annotation: { stats: { comments: number } } };
  console.log(`  → annotation.stats.comments=${full.stats.comments}`);

  console.log('[social] Bob unfollows Alice');
  const unfollow = await fetch(`${APP_URL}/api/follow/${alice.handle}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${bob.idToken}` },
  });
  console.log(`  → DELETE follow: ${unfollow.status} ${(await unfollow.json()).following}`);

  console.log('[social] Bob refetches following feed (should be empty)');
  const empty = await fetch(`${APP_URL}/api/feed/following`, {
    headers: { authorization: `Bearer ${bob.idToken}` },
  });
  const { clips: emptyClips } = (await empty.json()) as { clips: unknown[] };
  console.log(`  → ${emptyClips.length} clips`);

  console.log(`[social] ✅ live at ${APP_URL}/clip/${annotation.slug}`);

  if (process.env.CLEANUP === '1') {
    const mongo = new MongoClient(process.env.MONGODB_URI!);
    await mongo.connect();
    const db = mongo.db(process.env.MONGODB_DB ?? 'annotate_db');
    await db.collection('annotations').deleteOne({ slug: annotation.slug });
    await db.collection('comments').deleteMany({});
    await db.collection('users').deleteMany({ firebaseUid: { $in: [ALICE, BOB] } });
    await db.collection('follows').deleteMany({});
    await mongo.close();
    await Promise.all([ALICE, BOB].map((u) => getAuth().deleteUser(u).catch(() => {})));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
