/* eslint-disable no-console */
/**
 * Backfill uscEmbedding + workspaceId on every annotation that's missing them.
 * Idempotent. Run with: pnpm --filter @annotate/web exec tsx scripts/backfill-usc-embeddings.ts
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

import { embedText } from '../src/lib/embed';
import { ANNOTATE_PUBLIC_WORKSPACE, composeEmbeddableText } from '../src/lib/jobs/embed-annotation';

const PAGE_SIZE = 25;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const dbName = process.env.MONGODB_DB ?? 'annotate_db';

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(dbName).collection('annotations');

  let processed = 0;
  let failed = 0;
  let cursor: Date | null = null;

  while (true) {
    const filter: Record<string, unknown> = {
      $or: [
        { uscEmbedding: { $exists: false } },
        { uscEmbedding: null },
        { workspaceId: { $exists: false } },
      ],
    };
    if (cursor) (filter as Record<string, unknown>).createdAt = { $lt: cursor };

    const batch = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .toArray();

    if (batch.length === 0) break;

    for (const ann of batch) {
      try {
        const text = composeEmbeddableText({
          pageTitle: ann.pageDesign?.pageTitle ?? ann.source?.title,
          commentary: ann.commentary?.text ?? '',
          selectedText: ann.textContent?.selectedText,
        });
        if (!text.trim()) {
          await col.updateOne(
            { _id: ann._id },
            { $set: { workspaceId: ANNOTATE_PUBLIC_WORKSPACE, uscEmbedding: null } },
          );
          processed++;
          console.log(`  · ${ann.slug}: no text to embed, marked workspace only`);
          continue;
        }
        const vec = await embedText(text);
        await col.updateOne(
          { _id: ann._id },
          { $set: { uscEmbedding: vec, workspaceId: ANNOTATE_PUBLIC_WORKSPACE } },
        );
        processed++;
        console.log(`  ✓ ${ann.slug}: embedded (dim=${vec.length})`);
      } catch (e) {
        failed++;
        console.error(`  ✗ ${ann.slug}: ${e instanceof Error ? e.message : e}`);
      }
    }

    cursor = batch[batch.length - 1]!.createdAt as Date;
    if (batch.length < PAGE_SIZE) break;
  }

  console.log(`\n[backfill] done — ${processed} embedded, ${failed} failed`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
