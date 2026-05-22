import Link from 'next/link';

const CHROME_STORE_URL = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL ?? '/install-extension';

export function InstallExtensionCTA() {
  return (
    <section
      style={{
        padding: '80px 32px',
        maxWidth: 1080,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--rule-strong)',
          borderRadius: 12,
          padding: '48px 40px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: 48,
          alignItems: 'center',
        }}
      >
        <div>
          <div className="kicker" style={{ color: 'var(--accent)' }}>
            § the actual app
          </div>
          <h2
            className="serif"
            style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              lineHeight: 1.04,
              letterSpacing: '-0.025em',
              marginTop: 16,
              fontWeight: 500,
            }}
          >
            Annotate lives in your browser's{' '}
            <span className="serif-i" style={{ color: 'var(--accent)' }}>
              side panel.
            </span>
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--ink-2)',
              marginTop: 18,
              maxWidth: 560,
            }}
          >
            Install the Chrome extension to start clipping. Open any article, YouTube video, or
            podcast page — the side panel reads the page, you pick a moment, write your take,
            publish. The web app is where everything you publish gets a permanent page.
          </p>
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link
              href={CHROME_STORE_URL}
              className="btn"
              style={{ height: 44, padding: '0 20px', fontSize: 14 }}
            >
              Add to Chrome
            </Link>
            <Link
              href="/install-extension"
              className="btn btn--ghost"
              style={{ height: 44, padding: '0 20px', fontSize: 14 }}
            >
              Install instructions
            </Link>
          </div>
        </div>

        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {[
            { n: '01', t: 'Install the extension', b: 'One click from the Chrome Web Store.' },
            { n: '02', t: 'Open any video or article', b: 'Click the Annotate icon to open the side panel.' },
            { n: '03', t: 'Clip & publish', b: 'Pick the moment, write your take, publish a shareable page.' },
          ].map((s) => (
            <li
              key={s.n}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                paddingBottom: 18,
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', flex: '0 0 auto' }}>
                {s.n}
              </span>
              <div>
                <div className="serif" style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.2 }}>
                  {s.t}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>
                  {s.b}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
