import type { SourceMetadata } from '@annotate/shared';

export function normalizeSource(input: Partial<SourceMetadata> & { url: string }): SourceMetadata {
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    throw new Error('source.url must be a valid URL');
  }
  const canonical = new URL(url.toString());
  // strip common tracking params + fragment
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(
    (p) => canonical.searchParams.delete(p),
  );
  canonical.hash = '';

  return {
    url: url.toString(),
    canonicalUrl: canonical.toString(),
    title: input.title ?? url.hostname,
    domain: url.hostname.replace(/^www\./, ''),
    ogImage: input.ogImage,
    author: input.author,
    publishedAt: input.publishedAt,
  };
}
