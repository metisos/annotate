import { NextResponse } from 'next/server';
import { authenticateUscRequest, ANNOTATE_WORKSPACE } from '@/lib/usc/auth';
import { uscQuery } from '@/lib/usc/query';
import { checkDailyLimit } from '@/lib/rate-limit';
import type { UscQueryRequest } from '@/lib/usc/types';

export async function POST(req: Request) {
  // Auth
  const caller = authenticateUscRequest(req);
  if (!caller) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  // Workspace header (sacred — spec §8.1)
  const orgId = req.headers.get('x-org-id');
  if (!orgId) {
    return NextResponse.json({ error: 'X-Org-Id required' }, { status: 400 });
  }
  if (orgId !== ANNOTATE_WORKSPACE) {
    // We only serve 'annotate-public'. Per spec §6.2 a 404 lets the caller skip us.
    return NextResponse.json({ error: 'workspace not served by this platform' }, { status: 404 });
  }

  // Body
  let body: UscQueryRequest;
  try {
    body = (await req.json()) as UscQueryRequest;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (typeof body.actor_id !== 'string' || !body.actor_id) {
    return NextResponse.json({ error: 'actor_id required' }, { status: 400 });
  }
  if (body.temporal && typeof body.temporal.t_q === 'string' && isNaN(new Date(body.temporal.t_q).getTime())) {
    return NextResponse.json({ error: 'temporal.t_q must be ISO 8601' }, { status: 400 });
  }
  if (body.temporal && body.temporal.r_t <= 0) {
    return NextResponse.json({ error: 'temporal.r_t must be > 0' }, { status: 400 });
  }
  if (body.spatial && body.spatial.r_s <= 0) {
    return NextResponse.json({ error: 'spatial.r_s must be > 0' }, { status: 400 });
  }

  // Rate-limit per calling platform (suggest = USC daily kind — we use it as a
  // proxy until we add a dedicated 'usc-query' kind)
  const limit = await checkDailyLimit(`usc:${caller.callerId}`, 'suggest');
  if (!limit.ok) {
    return NextResponse.json({ error: 'rate limit reached' }, { status: 429 });
  }

  try {
    const result = await uscQuery({ workspaceId: orgId, query: body });
    // Workspace-boundary assertion (spec §8.1)
    for (const hit of result.hits) {
      if (hit.primitive.workspace_id !== orgId) {
        throw new Error(`workspace boundary violation: ${hit.primitive.identifier}`);
      }
    }
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'query failed';
    console.error('[usc/query] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
