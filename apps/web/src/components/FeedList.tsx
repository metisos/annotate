'use client';

import { useState } from 'react';
import type { Annotation } from '@annotate/shared';
import { AnnotationCard } from './AnnotationCard';

export function FeedList({
  initial,
  initialNextCursor,
  endpoint,
}: {
  initial: Annotation[];
  initialNextCursor: string | null;
  endpoint: string; // /api/clips · /api/feed/following · /api/search?q=...
}) {
  const [items, setItems] = useState<Annotation[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    setError(null);
    try {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set('before', cursor);
      url.searchParams.set('limit', '24');
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { clips: Annotation[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...data.clips]);
      setCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 18,
        }}
      >
        {items.map((a) => (
          <AnnotationCard key={a.slug} annotation={a} />
        ))}
      </div>
      {cursor && (
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button className="btn btn--ghost" onClick={loadMore} disabled={busy}>
            {busy ? 'Loading…' : 'Load more'}
          </button>
          {error && (
            <span className="mono" style={{ fontSize: 11, color: '#c8321c' }}>
              {error}
            </span>
          )}
        </div>
      )}
    </>
  );
}
