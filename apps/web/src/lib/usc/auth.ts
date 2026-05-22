/**
 * USC-side auth — Bearer tokens that remote platforms use when calling our
 * /api/usc/query. The header is `Authorization: Bearer <token>`.
 *
 * v1: a single shared token via the USC_FEDERATION_TOKEN env var (loaded from
 * Cloud Secret Manager in production). v2 will be a per-caller table.
 */

export interface UscCaller {
  callerId: string;
  /** Logged for audit. */
  source: 'env' | 'secret';
}

export function authenticateUscRequest(req: Request): UscCaller | null {
  const expected = process.env.USC_FEDERATION_TOKEN;
  if (!expected) return null; // misconfigured

  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (token !== expected) return null;

  const callerId = req.headers.get('x-usc-caller') ?? 'unknown';
  return { callerId, source: 'env' };
}

export const ANNOTATE_WORKSPACE = 'annotate-public';
