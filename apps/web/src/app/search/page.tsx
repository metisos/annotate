import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { searchAnnotations } from '@/lib/search';
import { SiteHeader } from '@/components/SiteHeader';
import { FeedList } from '@/components/FeedList';
import type { AvatarTone } from '@/components/Avatar';

export const dynamic = 'force-dynamic';

const TONES: AvatarTone[] = ['orange', 'blue', 'green', 'purple', 'ink', 'slate', 'cyan', 'red'];
function toneFor(seed: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return {
    title: q ? `Search · ${q} — Annotate` : 'Search — Annotate',
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const me = await getSessionUser();
  const result = q ? await searchAnnotations({ q, limit: 24 }) : { clips: [], nextCursor: null, total: 0 };

  return (
    <div className="ann" style={{ minHeight: '100dvh' }}>
      <SiteHeader user={me ? { name: me.displayName, handle: me.handle, tone: toneFor(me.handle), avatarUrl: me.avatarUrl } : undefined} />

      <section style={{ padding: '24px 40px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="kicker">§ search</span>
        <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          /SEARCH{q ? ` · ${result.total} HITS` : ''}
        </span>
      </section>

      <section style={{ padding: '32px 40px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <h1
          className="serif"
          style={{ fontSize: 56, lineHeight: 0.98, letterSpacing: '-0.035em', fontWeight: 500 }}
        >
          {q ? (
            <>
              Results for <span className="serif-i" style={{ color: 'var(--accent)' }}>“{q}”</span>
            </>
          ) : (
            <>Search.</>
          )}
        </h1>
        {!q && (
          <p
            className="serif-i"
            style={{ fontSize: 20, lineHeight: 1.45, color: 'var(--ink-2)', marginTop: 14, maxWidth: 680 }}
          >
            Use the magnifier in the header to search annotations by title, commentary, source, or tag.
          </p>
        )}
      </section>

      {q && (
        <section style={{ padding: '24px 40px 64px', maxWidth: 1280, margin: '0 auto' }}>
          {result.clips.length === 0 ? (
            <EmptySearch q={q} />
          ) : (
            <FeedList
              initial={result.clips}
              initialNextCursor={result.nextCursor}
              endpoint={`/api/search?q=${encodeURIComponent(q)}`}
            />
          )}
        </section>
      )}
    </div>
  );
}

function EmptySearch({ q }: { q: string }) {
  const seeds = ['Federal Reserve', 'Karpathy', 'TSMC', 'Powell', 'Buffett'];
  return (
    <div
      style={{
        padding: '40px 24px',
        background: 'var(--paper-2)',
        border: '1px dashed var(--rule-2)',
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <div className="serif-i" style={{ fontSize: 20, color: 'var(--ink-2)' }}>
        Nothing matched “{q}”.
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 12 }}>Try a different term:</p>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        {seeds.map((s) => (
          <Link
            key={s}
            href={`/search?q=${encodeURIComponent(s)}`}
            className="chip"
            style={{ textDecoration: 'none' }}
          >
            {s}
          </Link>
        ))}
      </div>
    </div>
  );
}
