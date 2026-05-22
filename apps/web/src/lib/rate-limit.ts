import { getDb } from './mongo';

export type LimitKind = 'text' | 'video' | 'audio' | 'aiDraft' | 'suggest';

const DAILY_LIMITS: Record<LimitKind, number> = {
  text: 100,
  video: 20,
  audio: 30,
  aiDraft: 50,
  suggest: 5,
};

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

export async function checkDailyLimit(
  userId: string,
  kind: LimitKind,
): Promise<{ ok: boolean; remaining: number; limit: number }> {
  const limit = DAILY_LIMITS[kind];
  const day = dayKey();
  const db = await getDb();
  const col = db.collection<{ userId: string; day: string; kind: LimitKind; count: number }>(
    'rate_limits',
  );

  const result = await col.findOneAndUpdate(
    { userId, day, kind },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: 'after' },
  );

  const count = result?.count ?? 1;
  const remaining = Math.max(0, limit - count);
  if (count > limit) {
    // refund — we already incremented but it's over
    await col.updateOne({ userId, day, kind }, { $inc: { count: -1 } });
    return { ok: false, remaining: 0, limit };
  }
  return { ok: true, remaining, limit };
}
