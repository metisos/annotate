import type { Annotation } from '@annotate/shared';
import { findRelatedAnnotations } from './related';
import { federateQuery } from './federate';
import type { UscHit } from './types';
import { ANNOTATE_WORKSPACE } from './auth';

export interface RelatedBundle {
  internal: Array<{ annotation: Annotation; score: number }>;
  external: UscHit[];
}

/**
 * "More like this" — local Annotate neighbors + cross-platform USC hits.
 * External hits gracefully no-op when no remotes are configured or reachable.
 */
export async function findRelatedBundle(input: {
  slug: string;
  embedding: number[] | null | undefined;
  semanticText?: string;
  temporal?: { t: string; rt: number };
  limit?: number;
}): Promise<RelatedBundle> {
  const limit = input.limit ?? 4;

  // Internal
  const internal = await findRelatedAnnotations({
    slug: input.slug,
    embedding: input.embedding,
    limit,
  });

  // External — only if we have either a semantic_text or a temporal anchor
  if (!input.semanticText && !input.temporal) {
    return { internal, external: [] };
  }

  const responses = await federateQuery({
    workspaceId: ANNOTATE_WORKSPACE,
    query: {
      actor_id: 'annotate-related',
      ...(input.semanticText ? { semantic_text: input.semanticText } : {}),
      ...(input.temporal ? { temporal: { t_q: input.temporal.t, r_t: input.temporal.rt } } : {}),
      limit,
      threshold: 0.2,
    },
  });

  const external: UscHit[] = [];
  for (const r of responses) {
    for (const h of r.hits.slice(0, limit)) {
      external.push(h);
    }
  }
  external.sort((a, b) => b.match_score - a.match_score);

  return { internal, external: external.slice(0, limit) };
}
