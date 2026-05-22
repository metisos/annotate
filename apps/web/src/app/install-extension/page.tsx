import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { Wordmark } from '@/components/Wordmark';
import { getSessionUser } from '@/lib/auth';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Install the Chrome extension — Annotate',
  description: 'Add Annotate to Chrome and start clipping moments from any media on the web.',
};

const CHROME_STORE_URL = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL;

export default async function InstallExtensionPage() {
  const me = await getSessionUser();

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
      <SiteHeader
        user={
          me
            ? { name: me.displayName, handle: me.handle, avatarUrl: me.avatarUrl ?? null }
            : undefined
        }
      />

      <section style={{ padding: '64px 32px 32px', maxWidth: 820, margin: '0 auto' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          § Chrome extension
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
            fontWeight: 500,
          }}
        >
          Add Annotate to{' '}
          <span className="serif-i" style={{ color: 'var(--accent)' }}>
            Chrome.
          </span>
        </h1>
        <p
          style={{
            marginTop: 18,
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--ink-2)',
            maxWidth: 640,
          }}
        >
          The extension is what does the clipping. The web app you're on now is where everything
          you publish lives. You need both.
        </p>

        {CHROME_STORE_URL ? (
          <div style={{ marginTop: 32 }}>
            <Link
              href={CHROME_STORE_URL}
              className="btn"
              style={{ height: 48, padding: '0 24px', fontSize: 14 }}
            >
              Add to Chrome
            </Link>
          </div>
        ) : (
          <div
            style={{
              marginTop: 32,
              padding: '14px 18px',
              background: 'var(--paper-2)',
              border: '1px dashed var(--rule-strong)',
              borderRadius: 8,
              fontSize: 13.5,
              color: 'var(--ink-2)',
              maxWidth: 640,
            }}
          >
            <strong style={{ color: 'var(--ink)' }}>Chrome Web Store listing — pending review.</strong>{' '}
            While we wait, you can load the unpacked build below. It takes about a minute.
          </div>
        )}
      </section>

      <div style={{ height: 1, background: 'var(--rule-strong)', margin: '0 32px' }} />

      <section style={{ padding: '40px 32px 80px', maxWidth: 820, margin: '0 auto' }}>
        <h2
          className="serif"
          style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            marginBottom: 24,
          }}
        >
          Load the unpacked dev build
        </h2>

        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {[
            {
              n: '01',
              t: 'Download the build',
              b: (
                <>
                  Download{' '}
                  <Link
                    href="https://github.com/metisos/annotate/raw/main/apps/extension/annotate-extension.zip"
                    style={{ color: 'var(--accent)' }}
                  >
                    annotate-extension.zip
                  </Link>{' '}
                  from the repo, then unzip it. You'll get a folder named{' '}
                  <span className="mono">annotate-extension</span>.
                </>
              ),
            },
            {
              n: '02',
              t: 'Open Chrome extensions',
              b: (
                <>
                  Navigate to <span className="mono">chrome://extensions</span> and flip on{' '}
                  <strong>Developer mode</strong> (top right).
                </>
              ),
            },
            {
              n: '03',
              t: 'Load unpacked',
              b: (
                <>
                  Click <strong>Load unpacked</strong> and select the{' '}
                  <span className="mono">annotate-extension</span> folder you just unzipped. Pin
                  Annotate so it's one click away.
                </>
              ),
            },
            {
              n: '04',
              t: 'Open the side panel',
              b: (
                <>
                  On any page — a YouTube video, an article, a podcast — click the Annotate
                  icon. The side panel opens. Sign in with Google. Clip away.
                </>
              ),
            },
          ].map((s) => (
            <li
              key={s.n}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                paddingBottom: 22,
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 12, color: 'var(--accent)', flex: '0 0 auto', width: 28 }}
              >
                {s.n}
              </span>
              <div>
                <div className="serif" style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.2 }}>
                  {s.t}
                </div>
                <div style={{ fontSize: 14.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.55 }}>
                  {s.b}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 32, lineHeight: 1.6 }}>
          Issues? Email{' '}
          <a href="mailto:cjohnson@metisos.com" style={{ color: 'var(--accent)' }}>
            cjohnson@metisos.com
          </a>
          .
        </p>
      </section>

      <footer
        style={{
          padding: '32px',
          borderTop: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--ink-3)',
          fontSize: 13,
        }}
      >
        <Wordmark variant="serif" size={16} />
        <Link href="/">Back to home</Link>
      </footer>
    </main>
  );
}
