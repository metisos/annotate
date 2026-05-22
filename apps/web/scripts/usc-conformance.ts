/* eslint-disable no-console */
/**
 * USC v1 conformance smoke test for Annotate.
 *
 * Runs against APP_URL (default http://localhost:3100). Requires the
 * USC_FEDERATION_TOKEN to be set in env so the script can authenticate.
 *
 * Covers spec §11.1 (identity/shape), §11.2 (multi-tenancy safety),
 * §11.3 (match-formula sanity).
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
const TOKEN = process.env.USC_FEDERATION_TOKEN;

function assertEq<T>(label: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}: ${ok ? 'OK' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
  if (!ok) process.exitCode = 1;
}
function assert(label: string, cond: boolean, detail?: string) {
  console.log(`${cond ? '  ✓' : '  ✗'} ${label}${detail ? ': ' + detail : ''}`);
  if (!cond) process.exitCode = 1;
}

async function uscQuery(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return fetch(`${APP_URL}/api/usc/query`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN ?? ''}`,
      'x-org-id': 'annotate-public',
      'x-usc-caller': 'conformance-test',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function main() {
  if (!TOKEN) {
    console.error('USC_FEDERATION_TOKEN not set — set it locally before running.');
    process.exit(1);
  }

  console.log(`[usc-conformance] target = ${APP_URL}`);

  // ─── §6.4 — /api/usc/info ────────────────────────────────────────
  console.log('\n=== §6.4 /api/usc/info ===');
  const infoRes = await fetch(`${APP_URL}/api/usc/info`);
  assertEq('info status', infoRes.status, 200);
  const info = await infoRes.json();
  assertEq('platform', info.platform, 'annotate');
  assertEq('protocol_version', info.protocol_version, '1.0.0');
  assert('tiers includes cognitive', info.tiers.includes('cognitive'));
  assert('embeddings declared', typeof info.embeddings?.dimensions === 'number');

  // ─── §11.2 — multi-tenancy safety ────────────────────────────────
  console.log('\n=== §11.2 multi-tenancy safety ===');

  const missingOrg = await fetch(`${APP_URL}/api/usc/query`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
      // intentionally omit X-Org-Id
    },
    body: JSON.stringify({ actor_id: 'test' }),
  });
  assertEq('missing X-Org-Id → 400', missingOrg.status, 400);

  const wrongOrg = await uscQuery({ actor_id: 'test' }, { 'x-org-id': 'some-other-workspace' });
  assertEq('wrong workspace → 404', wrongOrg.status, 404);

  const noAuth = await fetch(`${APP_URL}/api/usc/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-org-id': 'annotate-public' },
    body: JSON.stringify({ actor_id: 'test' }),
  });
  assertEq('missing auth → 401', noAuth.status, 401);

  // ─── §11.1 — identity + shape ────────────────────────────────────
  console.log('\n=== §11.1 identity + shape ===');

  const allRes = await uscQuery({ actor_id: 'conformance', limit: 1, tier: 'cognitive' });
  assertEq('basic query 200', allRes.status, 200);
  const allBody = await allRes.json();
  assert('hits is array', Array.isArray(allBody.hits));
  assertEq('platform tag', allBody.platform, 'annotate');

  if (allBody.hits.length > 0) {
    const hit = allBody.hits[0];
    assert('identifier present', typeof hit.primitive.identifier === 'string');
    assertEq('workspace boundary', hit.primitive.workspace_id, 'annotate-public');
    assertEq('tier=cognitive', hit.primitive.tier, 'cognitive');
    assert('temporal.t is ISO', !isNaN(new Date(hit.primitive.temporal.t).getTime()));
    assert('temporal.σt > 0', hit.primitive.temporal.σt > 0);
    assert('provenance.source_uri present', !!hit.primitive.provenance.source_uri);
    assertEq('spatial is null (we are aspatial)', hit.primitive.spatial, null);
  } else {
    console.log('  (no annotations in DB — skipping shape checks for hits)');
  }

  // ─── §11.3 — match formula sanity ─────────────────────────────────
  console.log('\n=== §11.3 match formula sanity ===');

  if (allBody.hits.length > 0) {
    const sample = allBody.hits[0].primitive;
    const t = sample.temporal.t;

    // Temporal at t = primitive's t → factor ≈ 1
    const exact = await uscQuery({
      actor_id: 'conformance',
      temporal: { t_q: t, r_t: 1 },
      limit: 50,
    });
    const exactBody = await exact.json();
    const exactHit = exactBody.hits.find((h: { primitive: { identifier: string } }) => h.primitive.identifier === sample.identifier);
    assert(
      'temporal at primitive.t scores ≈ 1',
      !!exactHit && exactHit.scoring.temporal !== null && exactHit.scoring.temporal > 0.9,
      `score=${exactHit?.scoring.temporal}`,
    );

    // Temporal far away → score collapses
    const distantTime = new Date(new Date(t).getTime() + 365 * 24 * 3600 * 1000).toISOString();
    const distant = await uscQuery({
      actor_id: 'conformance',
      temporal: { t_q: distantTime, r_t: 1 },
      limit: 50,
    });
    const distantBody = await distant.json();
    const distantHit = distantBody.hits.find((h: { primitive: { identifier: string } }) => h.primitive.identifier === sample.identifier);
    assert(
      'distant temporal does not return primitive (or score ≈ 0)',
      !distantHit || (distantHit.scoring.temporal ?? 1) < 0.01,
    );
  } else {
    console.log('  (no annotations to test against — publish a clip and re-run)');
  }

  // ─── Embedding L2 normalization ─────────────────────────────────
  console.log('\n=== embedding L2 normalization ===');
  if (allBody.hits.length > 0) {
    const samples = allBody.hits.filter(
      (h: { primitive: { embedding: number[] | null } }) => Array.isArray(h.primitive.embedding),
    ).slice(0, 5);
    if (samples.length === 0) {
      console.log('  (no hits with embeddings — backfill or wait for publish to embed)');
    } else {
      for (const h of samples) {
        const e: number[] = h.primitive.embedding;
        const dot = e.reduce((a, b) => a + b * b, 0);
        assert(`${h.primitive.identifier} L2-norm ≈ 1`, dot > 0.99 && dot < 1.01, `dot=${dot.toFixed(4)}`);
      }
    }
  }

  console.log(process.exitCode ? '\n[usc-conformance] ❌ failures above' : '\n[usc-conformance] ✅ all green');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
