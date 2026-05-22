import { getDb } from './mongo';

export interface HandleHistoryEntry {
  oldHandle: string;
  newHandle: string;
  userId: string;
  changedAt: Date;
  /** TTL: when this redirect should stop working. */
  expiresAt: Date;
}

const REDIRECT_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 12 months

export async function getHandleHistoryCol() {
  const db = await getDb();
  const col = db.collection<HandleHistoryEntry>('handle_history');
  // Idempotent index creation. Unique on oldHandle so we always redirect to the latest mapping.
  await col.createIndex({ oldHandle: 1 }, { unique: true, name: 'oldHandle_unique' }).catch(() => {});
  await col
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt_ttl' })
    .catch(() => {});
  return col;
}

/** Record a handle change for redirect support. */
export async function recordHandleChange(input: {
  oldHandle: string;
  newHandle: string;
  userId: string;
}): Promise<void> {
  const col = await getHandleHistoryCol();
  const now = new Date();
  // If somebody had previously taken oldHandle and changed away, overwrite.
  await col.updateOne(
    { oldHandle: input.oldHandle },
    {
      $set: {
        newHandle: input.newHandle,
        userId: input.userId,
        changedAt: now,
        expiresAt: new Date(now.getTime() + REDIRECT_TTL_MS),
      },
    },
    { upsert: true },
  );
  // If the new handle previously redirected somewhere, remove that stale redirect.
  await col.deleteOne({ oldHandle: input.newHandle });
}

/** Look up the current handle for a given (possibly old) handle. */
export async function resolveCurrentHandle(handle: string): Promise<string | null> {
  const col = await getHandleHistoryCol();
  const entry = await col.findOne({ oldHandle: handle.toLowerCase() });
  return entry?.newHandle ?? null;
}
