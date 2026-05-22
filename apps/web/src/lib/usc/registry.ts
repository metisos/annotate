/**
 * Registry of remote USC platforms we federate against.
 *
 * Configured via env. Each remote is declared as a pair:
 *   USC_REMOTE_<NAME>_URL   — base URL ending in /api/usc
 *   USC_REMOTE_<NAME>_TOKEN — bearer token to send (issued by that remote)
 *
 * Example (set in apphosting.yaml or .env.local):
 *   USC_REMOTE_CV_URL=https://cv.metisos.co/api/usc
 *   USC_REMOTE_CV_TOKEN=...
 *   USC_REMOTE_CASCADE_URL=https://cascade.metisos.co/api/usc
 *   USC_REMOTE_CASCADE_TOKEN=...
 *
 * When no remotes are configured, federation is a no-op.
 */

export interface RemotePlatform {
  id: string;       // 'cv', 'cascade', etc.
  baseUrl: string;  // ends in /api/usc
  token: string;
  /** Optional tier hint — skip the remote if its tiers don't intersect the query's. */
  tiers?: string[];
}

/** Lazily read registry from env. Returns [] if no remotes configured. */
export function getRemotePlatforms(): RemotePlatform[] {
  const platforms: RemotePlatform[] = [];
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^USC_REMOTE_([A-Z][A-Z0-9_]*)_URL$/);
    if (!m) continue;
    const upper = m[1];
    if (!upper) continue;
    const name = upper.toLowerCase();
    const url = process.env[k]?.trim();
    const token = process.env[`USC_REMOTE_${upper}_TOKEN`]?.trim();
    if (!url || !token) continue;
    const tiersEnv = process.env[`USC_REMOTE_${upper}_TIERS`]?.trim();
    platforms.push({
      id: name,
      baseUrl: url.replace(/\/$/, ''),
      token,
      tiers: tiersEnv ? tiersEnv.split(',').map((s) => s.trim()) : undefined,
    });
  }
  return platforms;
}
