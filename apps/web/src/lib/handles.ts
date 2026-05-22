import type { Collection } from 'mongodb';
import type { User } from '@annotate/shared';

/**
 * Reserved handles — anything that conflicts with a route or is a brand term.
 * Lowercase; checked before allowing a user to claim a handle.
 */
export const RESERVED_HANDLES = new Set([
  // Route segments
  'sign-in',
  'sign-up',
  'signin',
  'signup',
  'feed',
  'clip',
  'source',
  'portal',
  'api',
  'u',
  'search',
  'themes',
  'settings',
  'login',
  'logout',
  // Brand
  'annotate',
  'metis',
  'metisos',
  'doublecheck',
  // Common conflicts
  'admin',
  'root',
  'www',
  'mail',
  'help',
  'support',
  'about',
  'terms',
  'privacy',
  'pricing',
  'team',
  'staff',
  'docs',
  'blog',
  'home',
  'me',
  'you',
  'null',
  'undefined',
]);

const HANDLE_REGEX = /^[a-z][a-z0-9-]{2,19}$/;

export function sanitizeHandle(raw: string): string {
  const base = raw.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').slice(0, 20);
  if (HANDLE_REGEX.test(base) && !RESERVED_HANDLES.has(base)) return base;
  return `user${Math.floor(Math.random() * 9000 + 1000)}`;
}

/**
 * Validate a user-submitted handle. Returns null if valid, an error string otherwise.
 */
export function validateHandle(raw: string): string | null {
  if (!raw) return 'Handle is required';
  const handle = raw.toLowerCase();
  if (handle.length < 3) return 'Handle must be at least 3 characters';
  if (handle.length > 20) return 'Handle must be 20 characters or fewer';
  if (!HANDLE_REGEX.test(handle)) {
    return 'Handle must start with a letter and contain only lowercase letters, numbers, and hyphens';
  }
  if (RESERVED_HANDLES.has(handle)) return 'That handle is reserved';
  return null;
}

export async function pickAvailableHandle(
  col: Collection<User>,
  seed: string,
): Promise<string> {
  const base = sanitizeHandle(seed);
  if (!(await col.findOne({ handle: base }))) return base;
  for (let i = 2; i < 99; i++) {
    const candidate = `${base}${i}`;
    if (validateHandle(candidate)) continue;
    if (!(await col.findOne({ handle: candidate }))) return candidate;
  }
  return `${base}${Date.now().toString(36).slice(-4)}`;
}
