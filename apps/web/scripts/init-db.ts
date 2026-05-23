/* eslint-disable no-console */
/**
 * One-time index creation for the Annotate MongoDB.
 * Run with: pnpm --filter @annotate/web exec tsx scripts/init-db.ts
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const dbName = process.env.MONGODB_DB ?? 'annotate_db';

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.log(`Connected to ${dbName} on ${new URL(uri.replace('mongodb+srv://', 'https://')).host}`);

  const users = db.collection('users');
  const annotations = db.collection('annotations');
  const follows = db.collection('follows');
  const comments = db.collection('comments');
  const claims = db.collection('claims');
  const votes = db.collection('votes');

  const results = await Promise.all([
    users.createIndex({ firebaseUid: 1 }, { unique: true, name: 'firebaseUid_unique' }),
    users.createIndex({ handle: 1 }, { unique: true, name: 'handle_unique' }),

    annotations.createIndex({ slug: 1 }, { unique: true, name: 'slug_unique' }),
    annotations.createIndex({ userId: 1, createdAt: -1 }, { name: 'user_recent' }),
    annotations.createIndex({ 'source.canonicalUrl': 1, createdAt: -1 }, { name: 'source_recent' }),
    annotations.createIndex({ createdAt: -1 }, { name: 'global_feed' }),
    annotations.createIndex({ 'stats.votes': -1, createdAt: -1 }, { name: 'top_voted' }),

    follows.createIndex({ followerId: 1, followingId: 1 }, { unique: true, name: 'follow_pair' }),
    follows.createIndex({ followingId: 1, createdAt: -1 }, { name: 'followers_recent' }),

    comments.createIndex({ annotationId: 1, createdAt: -1 }, { name: 'comments_recent' }),

    claims.createIndex({ annotationId: 1, createdAt: -1 }, { name: 'claims_recent' }),

    votes.createIndex({ userId: 1, annotationId: 1 }, { unique: true, name: 'vote_pair' }),
    votes.createIndex({ annotationId: 1 }, { name: 'votes_by_annotation' }),
  ]);

  console.log('Created indexes:', results);

  // Backfill stats.votes on annotations published before upvoting existed.
  const backfill = await annotations.updateMany(
    { 'stats.votes': { $exists: false } },
    { $set: { 'stats.votes': 0 } },
  );
  console.log(`Backfilled stats.votes on ${backfill.modifiedCount} annotations`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
