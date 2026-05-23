import type { Annotation } from '@annotate/shared';
import type { Filter } from 'mongodb';
import { annotations, follows } from './mongo';

export interface PaginatedFeed {
  clips: Annotation[];
  nextCursor: string | null;
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 24;

export async function fetchFeed(input: {
  scope: 'public' | 'following';
  viewerId?: string;
  limit?: number;
  before?: string; // ISO date cursor
}): Promise<PaginatedFeed> {
  const limit = Math.min(Math.max(1, input.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
  const col = await annotations();

  const filter: Filter<Annotation> = { status: 'ready' };
  if (input.before) {
    const cursor = new Date(input.before);
    if (!isNaN(cursor.getTime())) {
      (filter as Filter<Annotation> & { createdAt: { $lt: Date } }).createdAt = { $lt: cursor };
    }
  }

  if (input.scope === 'following') {
    if (!input.viewerId) return { clips: [], nextCursor: null };
    const followingIds = (
      await (await follows()).find({ followerId: input.viewerId }).toArray()
    ).map((f) => f.followingId);
    if (followingIds.length === 0) return { clips: [], nextCursor: null };
    filter.userId = { $in: followingIds };
  }

  // Fetch one extra to know if there's another page
  const docs = await col.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).toArray();
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? (last.createdAt instanceof Date ? last.createdAt : new Date(last.createdAt)).toISOString()
      : null;

  return { clips: page, nextCursor };
}

/**
 * Top clips for the landing strip: highest-voted within a recent window,
 * topped up with the most recent ready clips so the strip is never thin
 * while the product is young. uscEmbedding is dropped to keep payloads small
 * (these feed AnnotationCard, which never reads it).
 */
export async function fetchTopClips(input?: {
  limit?: number;
  windowDays?: number;
}): Promise<Annotation[]> {
  const limit = Math.min(Math.max(1, input?.limit ?? 6), MAX_LIMIT);
  const windowDays = input?.windowDays ?? 30;
  const col = await annotations();
  const cutoff = new Date(Date.now() - windowDays * 86_400_000);

  const strip = (a: Annotation): Annotation => {
    const rest = { ...a };
    delete rest.uscEmbedding;
    return rest;
  };

  const top = (
    await col
      .find({ status: 'ready', createdAt: { $gte: cutoff } })
      .sort({ 'stats.votes': -1, createdAt: -1 })
      .limit(limit)
      .toArray()
  ).map(strip);

  if (top.length >= limit) return top;

  // Fallback: top up with most-recent ready clips not already included.
  const have = new Set(top.map((c) => String(c._id)));
  const recent = (
    await col.find({ status: 'ready' }).sort({ createdAt: -1 }).limit(limit * 2).toArray()
  ).map(strip);
  for (const c of recent) {
    if (top.length >= limit) break;
    if (!have.has(String(c._id))) top.push(c);
  }
  return top.slice(0, limit);
}
