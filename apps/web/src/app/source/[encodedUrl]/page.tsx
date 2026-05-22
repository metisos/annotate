import { notFound } from 'next/navigation';
import { annotations } from '@/lib/mongo';
import { getSessionUser } from '@/lib/auth';
import { SiteHeader } from '@/components/SiteHeader';
import { AnnotationCard } from '@/components/AnnotationCard';
import { External } from '@/components/Icons';
import type { AvatarTone } from '@/components/Avatar';

export const dynamic = 'force-dynamic';

const TONES: AvatarTone[] = ['orange', 'blue', 'green', 'purple', 'ink', 'slate', 'cyan', 'red'];
function toneFor(seed: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}

export default async function SourcePage({
  params,
}: {
  params: Promise<{ encodedUrl: string }>;
}) {
  const { encodedUrl } = await params;
  const decoded = decodeURIComponent(encodedUrl);
  if (!decoded) notFound();

  const me = await getSessionUser();

  let canonical: string;
  let domain: string;
  let displayTitle: string;
  try {
    const u = new URL(decoded);
    canonical = u.toString();
    domain = u.hostname.replace(/^www\./, '');
    displayTitle = `${domain}${u.pathname.length > 1 ? u.pathname : ''}`;
  } catch {
    notFound();
  }

  const col = await annotations();
  const list = await col
    .find({ status: 'ready', 'source.canonicalUrl': canonical })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const firstWithTitle = list.find((a) => a.source.title && a.source.title !== a.source.domain);
  const sourceTitle = firstWithTitle?.source.title ?? displayTitle;

  return (
    <div className="ann" style={{ minHeight: '100dvh' }}>
      <SiteHeader user={me ? { name: me.displayName, handle: me.handle, tone: toneFor(me.handle), avatarUrl: me.avatarUrl } : undefined} />

      <section style={{ padding: '24px 40px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="kicker">§ source</span>
        <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}
        >
          {list.length} ANNOTATIONS
        </span>
      </section>

      <section style={{ padding: '32px 40px 48px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Source</div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            fontWeight: 500,
            textWrap: 'pretty',
          }}
        >
          {sourceTitle}
        </h1>
        <a
          href={canonical}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--ghost btn--sm"
          style={{ marginTop: 18 }}
        >
          <External size={14} /> Open source
        </a>
      </section>

      <div style={{ height: 1, background: 'var(--rule-strong)', margin: '0 40px' }} />

      <section style={{ padding: '32px 40px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Every annotation on this source · {list.length}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 18,
          }}
        >
          {list.length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                background: 'var(--paper-2)',
                border: '1px dashed var(--rule-2)',
                borderRadius: 12,
                textAlign: 'center',
                gridColumn: '1 / -1',
              }}
            >
              <div className="serif-i" style={{ fontSize: 20, color: 'var(--ink-2)' }}>
                No one has annotated this source yet.
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 10 }}>
                Be the first — open the Chrome sidebar and clip a passage or moment.
              </p>
            </div>
          ) : (
            list.map((a) => <AnnotationCard key={a.slug} annotation={a} />)
          )}
        </div>
      </section>
    </div>
  );
}
