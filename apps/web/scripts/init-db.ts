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

  const results = await Promise.all([
    users.createIndex({ firebaseUid: 1 }, { unique: true, name: 'firebaseUid_unique' }),
    users.createIndex({ handle: 1 }, { unique: true, name: 'handle_unique' }),

    annotations.createIndex({ slug: 1 }, { unique: true, name: 'slug_unique' }),
    annotations.createIndex({ userId: 1, createdAt: -1 }, { name: 'user_recent' }),
    annotations.createIndex({ 'source.canonicalUrl': 1, createdAt: -1 }, { name: 'source_recent' }),
    annotations.createIndex({ createdAt: -1 }, { name: 'global_feed' }),

    follows.createIndex({ followerId: 1, followingId: 1 }, { unique: true, name: 'follow_pair' }),
    follows.createIndex({ followingId: 1, createdAt: -1 }, { name: 'followers_recent' }),

    comments.createIndex({ annotationId: 1, createdAt: -1 }, { name: 'comments_recent' }),

    claims.createIndex({ annotationId: 1, createdAt: -1 }, { name: 'claims_recent' }),
  ]);

  console.log('Created indexes:', results);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
