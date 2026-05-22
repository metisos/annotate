import { getRemotePlatforms, type RemotePlatform } from './registry';
import type { UscHit, UscQueryRequest, UscQueryResponse, UscTier } from './types';

const DEFAULT_TIMEOUT_MS = 6000;
const PLATFORM_ID = 'annotate';

/**
 * Fan a USC query out to every configured remote in parallel. Each remote that
 * doesn't respond in time or errors is dropped silently — the spec's federation
 * contract (§7.2) says "individual platforms that don't respond in time SHOULD
 * be dropped from the result with a warning, NOT cause the whole query to fail."
 *
 * Returns the raw responses per remote. Caller fuses + dedupes per §7.4.
 */
export async function federateQuery(input: {
  query: UscQueryRequest;
  workspaceId: string;
  timeoutMs?: number;
}): Promise<UscQueryResponse[]> {
  const remotes = getRemotePlatforms();
  if (remotes.length === 0) return [];

  const tierFilter = input.query.tier
    ? (Array.isArray(input.query.tier) ? input.query.tier : [input.query.tier])
    : null;

  const relevant = remotes.filter((r) => {
    if (!tierFilter || !r.tiers) return true;
    return r.tiers.some((t) => tierFilter.includes(t as UscTier));
  });

  const results = await Promise.allSettled(
    relevant.map((r) => callRemote(r, input.query, input.workspaceId, input.timeoutMs ?? DEFAULT_TIMEOUT_MS)),
  );

  const responses: UscQueryResponse[] = [];
  for (const [i, settled] of results.entries()) {
    if (settled.status === 'fulfilled' && settled.value) {
      responses.push(settled.value);
    } else if (settled.status === 'rejected') {
      console.warn(
        `[usc/federate] ${relevant[i]!.id} dropped: ${(settled.reason as Error)?.message ?? settled.reason}`,
      );
    }
  }
  return responses;
}

async function callRemote(
  remote: RemotePlatform,
  query: UscQueryRequest,
  workspaceId: string,
  timeoutMs: number,
): Promise<UscQueryResponse | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${remote.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${remote.token}`,
        'x-org-id': workspaceId,
        'x-usc-caller': PLATFORM_ID,
      },
      body: JSON.stringify(query),
      signal: ctrl.signal,
    });
    if (res.status === 404) return null; // remote doesn't serve this workspace
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`${remote.id} HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    return (await res.json()) as UscQueryResponse;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fuse local + remote responses per spec §7.4: dedupe by (workspace_id,
 * identifier), keep highest match_score, sort descending.
 */
export function fuseHits(...responses: UscQueryResponse[]): UscHit[] {
  const seen = new Map<string, UscHit>();
  for (const r of responses) {
    for (const hit of r.hits) {
      const key = `${hit.primitive.workspace_id}::${hit.primitive.identifier}`;
      const existing = seen.get(key);
      if (!existing || hit.match_score > existing.match_score) {
        seen.set(key, hit);
      }
    }
  }
  const out = Array.from(seen.values());
  out.sort((a, b) => b.match_score - a.match_score);
  return out;
}
