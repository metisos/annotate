import Link from 'next/link';
import { annotations, users, claims } from '@/lib/mongo';
import { getSessionUser } from '@/lib/auth';
import { Wordmark } from '@/components/Wordmark';

export const dynamic = 'force-dynamic';

// The /portal page is the LAUNCH-team view — Metis branding is appropriate here.
export const metadata = {
  title: 'Portal — Metis Analytics',
  description: 'Two media intelligence products sharing one DNA.',
};

async function loadMetrics() {
  const [annCount, userCount, claimsCount, recentAnns] = await Promise.all([
    (await annotations()).countDocuments({ status: 'ready' }),
    (await users()).estimatedDocumentCount(),
    (await claims()).countDocuments({}),
    (await annotations()).find({ status: 'ready' }).sort({ createdAt: -1 }).limit(5).toArray(),
  ]);
  return { annCount, userCount, claimsCount, recentAnns };
}

export default async function PortalPage() {
  void (await getSessionUser());
  const m = await loadMetrics();

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
      <header
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <Link href="/">
          <Wordmark variant="serif" size={20} />
        </Link>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
          PORTAL · LAUNCH TEAM VIEW
        </div>
      </header>

      <section style={{ padding: '64px 32px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>§ Metis Analytics</div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(48px, 7vw, 80px)',
            lineHeight: 0.98,
            letterSpacing: '-0.035em',
            fontWeight: 500,
            textWrap: 'pretty',
            maxWidth: 1000,
          }}
        >
          Two media intelligence products.{' '}
          <span className="serif-i" style={{ color: 'var(--accent)' }}>One DNA.</span>
        </h1>
        <p
          className="serif-i"
          style={{ fontSize: 22, lineHeight: 1.45, color: 'var(--ink-2)', marginTop: 24, maxWidth: 800 }}
        >
          URL in, structured intelligence out. Annotate clips the moment; Doublecheck verifies the claim. Same media-ingestion pipeline, same AI agent stack, same studio.
        </p>
      </section>

      <section
        style={{
          padding: '32px 32px 64px',
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 24,
        }}
      >
        <ProductCard
          name="Annotate"
          tagline="AI-powered media annotation and social sharing"
          href="/"
          stats={[
            { label: 'Annotations', value: String(m.annCount) },
            { label: 'Users', value: String(m.userCount) },
            { label: 'Claims filed', value: String(m.claimsCount) },
          ]}
          stack={['Chrome MV3', 'Next.js · Firebase App Hosting', 'MongoDB Atlas', 'E2B sandbox', 'Twelve Labs', 'Vertex / Gemini 2.5']}
        />
        <ProductCard
          name="Doublecheck"
          tagline="Real-time fact-checking for live media"
          href="https://doublecheck.metisos.co"
          external
          stats={[
            { label: 'Status', value: 'Live' },
            { label: 'Shared with Annotate', value: 'Auth · Storage · Vertex' },
          ]}
          stack={['Live ingest', 'Twelve Labs', 'Vertex / Gemini', 'Same Firebase project']}
        />
      </section>

      <div style={{ height: 1, background: 'var(--rule-strong)', margin: '0 32px' }} />

      <section style={{ padding: '64px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Recent annotations</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 16,
          }}
        >
          {m.recentAnns.length === 0 ? (
            <div
              style={{
                padding: 24,
                background: 'var(--paper-2)',
                border: '1px dashed var(--rule-2)',
                borderRadius: 12,
                color: 'var(--ink-3)',
                gridColumn: '1 / -1',
              }}
            >
              No annotations published yet.
            </div>
          ) : (
            m.recentAnns.map((a) => (
              <Link
                key={a.slug}
                href={`/clip/${a.slug}`}
                style={{
                  padding: 16,
                  background: 'var(--paper-2)',
                  border: '1px solid var(--rule)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {a.type} · {a.pageDesign?.theme ?? 'conversation'}
                </div>
                <div className="serif" style={{ fontSize: 16, marginTop: 6, lineHeight: 1.25, letterSpacing: '-0.015em' }}>
                  {a.pageDesign?.pageTitle ?? a.source.title}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6 }}>
                  {a.source.domain}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <footer
        style={{
          padding: '40px 32px',
          borderTop: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--ink-3)',
          fontSize: 13,
        }}
      >
        <span className="mono" style={{ fontSize: 10.5, letterSpacing: '0.12em' }}>
          ANNOTATE · A METIS ANALYTICS PRODUCT
        </span>
        <div style={{ display: 'flex', gap: 22 }}>
          <Link href="/feed">Feed</Link>
          <Link href="/">Landing</Link>
        </div>
      </footer>
    </main>
  );
}

function ProductCard({
  name,
  tagline,
  href,
  external,
  stats,
  stack,
}: {
  name: string;
  tagline: string;
  href: string;
  external?: boolean;
  stats: Array<{ label: string; value: string }>;
  stack: string[];
}) {
  const Wrapper = (props: React.PropsWithChildren) =>
    external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        {props.children}
      </a>
    ) : (
      <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {props.children}
      </Link>
    );

  return (
    <Wrapper>
      <article
        style={{
          padding: 28,
          background: 'var(--paper-2)',
          border: '1px solid var(--rule)',
          borderRadius: 14,
          minHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="serif" style={{ fontSize: 38, letterSpacing: '-0.03em', fontWeight: 500 }}>
            {name}
          </div>
          {external && <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>↗</span>}
        </div>
        <div className="serif-i" style={{ fontSize: 18, color: 'var(--ink-2)', lineHeight: 1.35 }}>
          {tagline}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12, marginTop: 'auto' }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className="eyebrow" style={{ fontSize: 9.5 }}>{s.label}</div>
              <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.02em', marginTop: 2 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {stack.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
      </article>
    </Wrapper>
  );
}
