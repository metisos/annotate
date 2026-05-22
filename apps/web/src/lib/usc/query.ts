import { ObjectId } from 'mongodb';
import type { Filter } from 'mongodb';
import type { Annotation, User } from '@annotate/shared';
import { annotations, users } from '../mongo';
import { cosineSimilarity, embedText } from '../embed';
import { annotationToUscPrimitive, sourceTypeForAnnotation } from './mapping';
import type { UscHit, UscQueryRequest, UscQueryResponse } from './types';

const ANNOTATE_WORKSPACE = 'annotate-public';
const PLATFORM_ID = 'annotate';
const DEFAULT_LIMIT = 10;
const DEFAULT_THRESHOLD = 0.05;

export async function uscQuery(input: {
  workspaceId: string;
  query: UscQueryRequest;
}): Promise<UscQueryResponse> {
  const { query } = input;

  // Workspace check — we only serve 'annotate-public' in v1.
  if (input.workspaceId !== ANNOTATE_WORKSPACE) {
    // Per spec §6.2: workspace doesn't exist on this platform → caller may skip.
    return { hits: [], total: 0, platform: PLATFORM_ID };
  }

  // Tier filter — we serve only 'cognitive'. If a query specifies tiers and
  // 'cognitive' isn't in the set, return empty.
  if (query.tier) {
    const tiers = Array.isArray(query.tier) ? query.tier : [query.tier];
    if (!tiers.includes('cognitive')) {
      return { hits: [], total: 0, platform: PLATFORM_ID };
    }
  }

  // Spatial: we have no spatial primitives. If the query asks for spatial and
  // include_aspatial is false, we have nothing to offer.
  if (query.spatial && !query.include_aspatial) {
    return { hits: [], total: 0, platform: PLATFORM_ID };
  }

  // Source-type filter
  let sourceTypeFilter: string[] | null = null;
  if (query.source_type) {
    sourceTypeFilter = Array.isArray(query.source_type) ? query.source_type : [query.source_type];
  }

  // Pull candidates. We pre-filter on status + workspace and (optionally) source type.
  const mongoFilter: Filter<Annotation> = {
    status: 'ready',
    workspaceId: ANNOTATE_WORKSPACE,
  };
  if (sourceTypeFilter) {
    const types = sourceTypeFilter
      .map((st) =>
        st === 'annotation_video'
          ? 'video'
          : st === 'annotation_audio'
            ? 'audio'
            : st === 'annotation_text'
              ? 'text'
              : null,
      )
      .filter((t): t is 'video' | 'audio' | 'text' => t !== null);
    if (types.length === 0) return { hits: [], total: 0, platform: PLATFORM_ID };
    mongoFilter.type = { $in: types };
  }

  // Optional rough temporal pre-filter (10× r_t window) to limit candidates.
  // Per spec the match formula is the authoritative filter; this is just to
  // keep the candidate set bounded.
  if (query.temporal) {
    const t = new Date(query.temporal.t_q).getTime();
    if (!isNaN(t)) {
      const window = Math.max(1, query.temporal.r_t * 10) * 1000;
      mongoFilter.createdAt = {
        $gte: new Date(t - window),
        $lte: new Date(t + window),
      };
    }
  }

  const col = await annotations();
  const candidates = await col.find(mongoFilter).limit(500).toArray();

  if (candidates.length === 0) {
    return { hits: [], total: 0, platform: PLATFORM_ID };
  }

  // Pre-load authors for payload (one query, dedup by id)
  const authorObjectIds = Array.from(
    new Set(candidates.map((a) => a.userId).filter((id) => /^[0-9a-f]{24}$/i.test(id))),
  ).map((id) => new ObjectId(id));
  const usersCol = await users();
  const authorDocs = authorObjectIds.length
    ? await usersCol
        .find({ _id: { $in: authorObjectIds } } as unknown as Parameters<typeof usersCol.findOne>[0])
        .toArray()
    : [];
  const authorByUserId = new Map<string, Pick<User, 'handle' | 'displayName'>>();
  for (const u of authorDocs) {
    authorByUserId.set(String(u._id), { handle: u.handle, displayName: u.displayName });
  }

  // Optional query embedding
  let queryEmbedding: number[] | null = null;
  if (query.semantic_text?.trim()) {
    queryEmbedding = await embedText(query.semantic_text.trim());
  }

  // Score each candidate per the spec §6.5 match formula.
  const threshold = query.threshold ?? DEFAULT_THRESHOLD;
  const scored: UscHit[] = [];
  for (const ann of candidates) {
    let spatialFactor: number | null = null;
    let temporalFactor: number | null = null;
    let semanticFactor: number | null = null;

    if (query.spatial && query.include_aspatial && !ann.workspaceId /* never */) {
      // unreachable — we have no spatial primitives, ann.spatial would be null
    }
    if (query.spatial && query.include_aspatial) {
      spatialFactor = 1.0; // we treat null-spatial as score 1 when include_aspatial
    }

    let temporalDistance: number | null = null;
    if (query.temporal) {
      // Compute primitive's temporal coords
      const primTemporal = (() => {
        if (ann.clip) {
          const sourceMs = ann.source.publishedAt
            ? new Date(ann.source.publishedAt as string).getTime()
            : new Date(ann.createdAt as string).getTime();
          const startMs = sourceMs + ann.clip.startTime * 1000;
          return { t: startMs, σt: Math.max(1, ann.clip.duration) };
        }
        const t = ann.source.publishedAt
          ? new Date(ann.source.publishedAt as string)
          : new Date(ann.createdAt as string);
        return { t: t.getTime(), σt: 86400 };
      })();
      const tq = new Date(query.temporal.t_q).getTime();
      if (!isNaN(tq)) {
        const dt = Math.abs((tq - primTemporal.t) / 1000); // seconds
        temporalDistance = dt;
        const σ2 = primTemporal.σt ** 2 + query.temporal.r_t ** 2;
        temporalFactor = Math.exp(-(dt * dt) / (2 * σ2));
      }
    }

    if (queryEmbedding && ann.uscEmbedding) {
      const cos = cosineSimilarity(queryEmbedding, ann.uscEmbedding);
      semanticFactor = Math.max(0, cos);
    } else if (queryEmbedding) {
      // No embedding on this candidate — skip semantic; it gets factor null
      semanticFactor = 0;
    }

    // C(p,Q) = product of factors that are present, default 1.0 when absent
    let score = 1.0;
    let touched = false;
    if (spatialFactor !== null) {
      score *= spatialFactor;
      touched = true;
    }
    if (temporalFactor !== null) {
      score *= temporalFactor;
      touched = true;
    }
    if (semanticFactor !== null) {
      score *= semanticFactor;
      touched = true;
    }
    if (!touched) {
      // Pure list-the-tier query — fall back to recency by treating all as 1.0
      score = 1.0;
    }
    if (score < threshold) continue;

    const author = authorByUserId.get(ann.userId);
    scored.push({
      primitive: annotationToUscPrimitive({ annotation: ann, author }),
      match_score: score,
      scoring: {
        spatial: spatialFactor,
        temporal: temporalFactor,
        semantic: semanticFactor,
      },
      distances: {
        spatial_m: null,
        temporal_s: temporalDistance,
      },
    });
  }

  scored.sort((a, b) => b.match_score - a.match_score);
  const limit = Math.min(100, Math.max(1, query.limit ?? DEFAULT_LIMIT));
  return {
    hits: scored.slice(0, limit),
    total: scored.length,
    platform: PLATFORM_ID,
  };
}
