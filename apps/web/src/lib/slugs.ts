import type { Collection } from 'mongodb';
import type { Annotation } from '@annotate/shared';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
}

function rand(n = 5): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function pickAvailableSlug(
  col: Collection<Annotation>,
  seed: string,
): Promise<string> {
  const base = slugify(seed) || 'clip';
  if (!(await col.findOne({ slug: base }, { projection: { _id: 1 } }))) return base;
  for (let i = 0; i < 4; i++) {
    const candidate = `${base}-${rand(5)}`;
    if (!(await col.findOne({ slug: candidate }, { projection: { _id: 1 } }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
