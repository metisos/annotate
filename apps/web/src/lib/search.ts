import type { Annotation } from '@annotate/shared';
import type { Filter } from 'mongodb';
import { annotations } from './mongo';
import { cosineSimilarity, embedText } from './embed';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 24;
const REGEX_WEIGHT = 0.4;
const SEMANTIC_WEIGHT = 0.6;
const CANDIDATE_CAP = 500;
const MIN_SCORE = 0.05;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SearchResult {
  clips: Annotation[];
  nextCursor: string | null;
  total: number;
}

/**
 * Hybrid search — regex match across text fields + cosine similarity against
 * the USC embedding. Combined score = 0.4·regex + 0.6·semantic. Falls back to
 * pure regex if Vertex is unhealthy or no candidates have embeddings.
 */
export async function searchAnnotations(input: {
  q: string;
  limit?: number;
  before?: string;
}): Promise<SearchResult> {
  const q = input.q.trim();
  if (!q) return { clips: [], nextCursor: null, total: 0 };

  const limit = Math.min(Math.max(1, input.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
  const re = new RegExp(escapeRegex(q), 'i');

  const filter: Filter<Annotation> = {
    status: 'ready',
    $or: [
      { 'pageDesign.pageTitle': re },
      { 'commentary.text': re },
      { 'source.title': re },
      { 'source.domain': re },
      { 'pageDesign.suggestedTags': re },
      { 'textContent.selectedText': re },
    ],
  };
  if (input.before) {
    const cursor = new Date(input.before);
    if (!isNaN(cursor.getTime())) {
      (filter as Filter<Annotation> & { createdAt: { $lt: Date } }).createdAt = { $lt: cursor };
    }
  }

  const col = await annotations();
  const regexHits = await col.find(filter).limit(CANDIDATE_CAP).toArray();

  // Embed the query (optional — graceful regex-only fallback)
  let queryVector: number[] | null = null;
  try {
    queryVector = await embedText(q);
  } catch (e) {
    console.warn(
      '[search] embed query failed, falling back to regex only:',
      e instanceof Error ? e.message : e,
    );
  }

  // Pull additional semantic-only candidates that don't match regex.
  let semanticOnly: Annotation[] = [];
  if (queryVector) {
    const seenSlugs = new Set(regexHits.map((r) => r.slug));
    const filterSemantic: Filter<Annotation> = {
      status: 'ready',
      uscEmbedding: { $exists: true, $ne: null },
      slug: { $nin: Array.from(seenSlugs) },
    };
    if (input.before) {
      const cursor = new Date(input.before);
      if (!isNaN(cursor.getTime())) {
        (filterSemantic as Filter<Annotation> & { createdAt: { $lt: Date } }).createdAt = {
          $lt: cursor,
        };
      }
    }
    semanticOnly = await col
      .find(filterSemantic, {
        projection: {
          uscEmbedding: 1,
          slug: 1,
          pageDesign: 1,
          source: 1,
          commentary: 1,
          type: 1,
          clip: 1,
          userId: 1,
          stats: 1,
          createdAt: 1,
          status: 1,
          textContent: 1,
        },
      })
      .limit(CANDIDATE_CAP)
      .toArray();
  }

  // Score everything in memory.
  const scored: Array<{ ann: Annotation; score: number }> = [];
  for (const ann of regexHits) {
    let regexScore = 0;
    if (re.test(ann.pageDesign?.pageTitle ?? '')) regexScore = Math.max(regexScore, 1.0);
    if (re.test(ann.source.title ?? '')) regexScore = Math.max(regexScore, 0.9);
    if (re.test(ann.commentary.text ?? '')) regexScore = Math.max(regexScore, 0.75);
    if (re.test(ann.source.domain)) regexScore = Math.max(regexScore, 0.5);
    if (re.test(ann.textContent?.selectedText ?? '')) regexScore = Math.max(regexScore, 0.6);
    if ((ann.pageDesign?.suggestedTags ?? []).some((t) => re.test(t)))
      regexScore = Math.max(regexScore, 0.7);

    let semanticScore = 0;
    if (queryVector && ann.uscEmbedding) {
      semanticScore = Math.max(0, cosineSimilarity(queryVector, ann.uscEmbedding));
    }

    const score = queryVector
      ? REGEX_WEIGHT * regexScore + SEMANTIC_WEIGHT * semanticScore
      : regexScore;
    if (score >= MIN_SCORE) scored.push({ ann, score });
  }
  for (const ann of semanticOnly) {
    if (!ann.uscEmbedding || !queryVector) continue;
    const semanticScore = Math.max(0, cosineSimilarity(queryVector, ann.uscEmbedding));
    if (semanticScore < 0.45) continue; // semantic-only needs a higher bar
    const score = SEMANTIC_WEIGHT * semanticScore;
    if (score >= MIN_SCORE) scored.push({ ann, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const overflow = scored.slice(0, limit + 1);
  const hasMore = overflow.length > limit;
  const truncated = hasMore ? overflow.slice(0, limit) : overflow;
  const last = truncated[truncated.length - 1]?.ann;
  const nextCursor =
    hasMore && last
      ? (last.createdAt instanceof Date ? last.createdAt : new Date(last.createdAt)).toISOString()
      : null;

  return {
    clips: truncated.map((s) => s.ann),
    nextCursor,
    total: scored.length,
  };
}
