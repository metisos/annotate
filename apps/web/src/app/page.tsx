import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';
import { InstallExtensionCTA } from '@/components/InstallExtensionCTA';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const me = await getSessionUser();
  const dashboardHref = me ? `/u/${me.handle}` : '/sign-in';

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
        <Wordmark variant="serif" size={20} />
        <nav style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {me ? (
            <>
              <Link href="/feed" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Feed
              </Link>
              <Link href={dashboardHref} className="btn btn--accent btn--sm">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Sign in
              </Link>
              <Link href="/sign-up" className="btn btn--accent btn--sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section
        style={{
          padding: '120px 32px 80px',
          maxWidth: 1080,
          margin: '0 auto',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 24 }}>
          § a Chrome sidebar for the curious
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(48px, 8vw, 96px)',
            lineHeight: 0.98,
            letterSpacing: '-0.035em',
            fontWeight: 500,
            textWrap: 'pretty',
            maxWidth: 900,
          }}
        >
          Clip a moment.{' '}
          <span className="serif-i" style={{ color: 'var(--accent)' }}>
            Annotate it.
          </span>{' '}
          Share what you actually think.
        </h1>
        <p
          className="serif-i"
          style={{
            fontSize: 22,
            lineHeight: 1.45,
            color: 'var(--ink-2)',
            marginTop: 32,
            maxWidth: 680,
          }}
        >
          Highlight a passage, clip a 60-second moment from a video or podcast, and publish a
          shareable page that links back to the source. The AI assists you in writing your
          take — you stay the author.
        </p>

        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 14 }}>
          {me ? (
            <>
              <Link href={dashboardHref} className="btn" style={{ height: 48, padding: '0 22px', fontSize: 14 }}>
                Go to dashboard
              </Link>
              <Link href="/feed" className="btn btn--ghost" style={{ height: 48, padding: '0 22px', fontSize: 14 }}>
                Browse the feed
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-up" className="btn" style={{ height: 48, padding: '0 22px', fontSize: 14 }}>
                Get started — it's free
              </Link>
              <Link href="/sign-in" className="btn btn--ghost" style={{ height: 48, padding: '0 22px', fontSize: 14 }}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <InstallExtensionCTA />

      <div style={{ height: 1, background: 'var(--rule-strong)', margin: '0 32px' }} />

      <section
        style={{
          padding: '64px 32px',
          maxWidth: 1080,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 48,
        }}
      >
        {[
          {
            kicker: '01 · capture',
            title: 'Clip what matters.',
            body: 'Highlight an article passage or pick a 90-second range from any YouTube video or podcast. The clip is saved at 240p, sourced back, and ready to share.',
          },
          {
            kicker: '02 · draft',
            title: 'AI writes the first take.',
            body: 'Toggle AI Assist on and the Annotate Agent reads what you clipped, drafts an annotation in your voice, and pulls in supporting and contradicting sources from the web.',
          },
          {
            kicker: '03 · publish',
            title: 'Every clip gets a page.',
            body: 'Each annotation publishes to a unique editorial page with its own visual identity — a real shareable artifact, not just a tweet that disappears.',
          },
        ].map((f) => (
          <div key={f.kicker}>
            <div className="kicker" style={{ color: 'var(--accent)' }}>
              {f.kicker}
            </div>
            <h3
              className="serif"
              style={{
                fontSize: 28,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                marginTop: 12,
                fontWeight: 500,
              }}
            >
              {f.title}
            </h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', marginTop: 12 }}>
              {f.body}
            </p>
          </div>
        ))}
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
        <Wordmark variant="serif" size={16} />
        <div style={{ display: 'flex', gap: 22 }}>
          <Link href="/install-extension">Install extension</Link>
          <Link href="/privacy">Privacy</Link>
          {me ? (
            <Link href={dashboardHref}>Dashboard</Link>
          ) : (
            <>
              <Link href="/sign-in">Sign in</Link>
              <Link href="/sign-up">Get started</Link>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}
