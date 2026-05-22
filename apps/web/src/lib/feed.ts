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
