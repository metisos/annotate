import type { Annotation } from '@annotate/shared';
import { annotations } from '../mongo';
import { cosineSimilarity } from '../embed';

/**
 * Find semantically related annotations to a given one. Naive O(N) cosine
 * scan — fine up to a few thousand docs. Swap for Atlas Vector Search when
 * we need scale.
 */
export async function findRelatedAnnotations(input: {
  slug: string;
  embedding: number[] | null | undefined;
  limit?: number;
}): Promise<Array<{ annotation: Annotation; score: number }>> {
  if (!input.embedding) return [];
  const limit = input.limit ?? 4;

  const col = await annotations();
  const candidates = await col
    .find(
      {
        status: 'ready',
        slug: { $ne: input.slug },
        uscEmbedding: { $exists: true, $ne: null },
      },
      { projection: { uscEmbedding: 1, slug: 1, pageDesign: 1, source: 1, commentary: 1, type: 1, clip: 1, userId: 1, stats: 1, createdAt: 1 } },
    )
    .limit(1000)
    .toArray();

  const scored: Array<{ annotation: Annotation; score: number }> = [];
  for (const c of candidates) {
    if (!c.uscEmbedding) continue;
    const score = cosineSimilarity(input.embedding, c.uscEmbedding);
    if (score < 0.3) continue; // skip very weak matches
    scored.push({ annotation: c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
