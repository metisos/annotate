import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { Wordmark } from '@/components/Wordmark';
import { getSessionUser } from '@/lib/auth';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy policy — Annotate',
  description: 'How Annotate collects, uses, stores, and protects your data.',
};

const LAST_UPDATED = '2026-05-20';

export default async function PrivacyPolicyPage() {
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

      <article
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '56px 32px 80px',
          fontSize: 15.5,
          lineHeight: 1.65,
          color: 'var(--ink)',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          § policy
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            fontWeight: 500,
            marginBottom: 14,
          }}
        >
          Privacy policy
        </h1>
        <p className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 36 }}>
          Last updated · {LAST_UPDATED}
        </p>

        <Section title="1. Who we are">
          <p>
            Annotate is a Chrome extension and web app at{' '}
            <Link href="/" style={linkStyle}>
              annotate.metisos.co
            </Link>{' '}
            that lets you clip a moment from any media on the web — an article passage, a
            YouTube video range, an audio segment — write your commentary, and publish it as
            a shareable page that links back to the source. Annotate is operated by the team
            at metisos.com. Contact:{' '}
            <a href="mailto:cjohnson@metisos.com" style={linkStyle}>
              cjohnson@metisos.com
            </a>
            .
          </p>
        </Section>

        <Section title="2. What we collect">
          <p>
            We only collect information you give us directly or content you choose to publish.
            Specifically:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Authentication information.</strong> When you sign in with Google, we
              receive your name, email address, and a Google-issued ID token from Firebase
              Authentication. We use this only to identify you and to mint a session cookie.
            </li>
            <li>
              <strong>Website content you choose to clip.</strong> When you click the Annotate
              icon on a page or video, we capture the page URL, page title, any text you have
              selected, and (for YouTube) the video's current timestamp and duration. None of
              this is read in the background — only at the moment you click.
            </li>
            <li>
              <strong>Annotations you publish.</strong> The commentary you write, the clip
              range you pick, tags you add, and any media we extract on your behalf (a 360p
              video clip or a 128 kbps audio clip from the source you specified).
            </li>
            <li>
              <strong>Social activity.</strong> Follows, comments, and shares that you
              initiate inside the product.
            </li>
            <li>
              <strong>Profile data you provide.</strong> Display name, handle, optional bio,
              optional avatar image.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> collect: browsing history, mouse position, keystrokes,
            scroll behaviour, IP-based location, financial information, health information, or
            content from any page you did not explicitly click Annotate on.
          </p>
        </Section>

        <Section title="3. How we use it">
          <p>
            We use the data above strictly to deliver the product:
          </p>
          <ul style={listStyle}>
            <li>Authenticate you and keep you signed in.</li>
            <li>Render annotations you publish at <span className="mono">/clip/[slug]</span>.</li>
            <li>
              Generate optional AI-assisted drafts, page layouts, and suggested clip moments
              for content you choose to publish. AI processing is performed on the text and
              URL you have already chosen to clip; we do not send any data to AI providers
              that you have not chosen to publish or draft against.
            </li>
            <li>Show your annotations on your profile page and the public feed.</li>
            <li>Maintain the cross-platform USC v1 protocol: published annotations are queryable as semantic neighbors by other USC platforms, with the author handle preserved as attribution. See <Link href="/install-extension" style={linkStyle}>install instructions</Link> and our <a href="https://github.com/metisos/annotate" style={linkStyle}>open-source repository</a>.</li>
          </ul>
          <p>
            We do not use your data for advertising, profiling, or third-party retargeting. We
            do not show ads. We do not run third-party trackers on published clip pages.
          </p>
        </Section>

        <Section title="4. Where it lives">
          <ul style={listStyle}>
            <li>
              <strong>Identity:</strong> Firebase Authentication (Google Cloud, project{' '}
              <span className="mono">doublecheck-348a2</span>).
            </li>
            <li>
              <strong>Annotations, profile, social graph:</strong> MongoDB Atlas
              (US-region cluster).
            </li>
            <li>
              <strong>Clipped media (video / audio / thumbnails / avatars):</strong> Google
              Cloud Storage,{' '}
              <span className="mono">gs://annotate-clips-prod</span> (public-read).
            </li>
            <li>
              <strong>AI processing:</strong> Google Vertex AI (text generation and
              embeddings).
            </li>
            <li>
              <strong>Video indexing:</strong> Twelve Labs (semantic video search across
              published clips).
            </li>
            <li>
              <strong>In-Chrome local cache:</strong>{' '}
              <span className="mono">chrome.storage.local</span> holds your cached display
              name and handle on your device only.
            </li>
          </ul>
        </Section>

        <Section title="5. What we share">
          <p>
            <strong>Public by default.</strong> Every annotation you publish is a public
            artifact: anyone with the URL can read it, the public feed lists it, and other
            USC-conformant platforms can discover it as a related result. Your handle is
            shown as the author. Do not clip content you would not be comfortable being
            attached to your name.
          </p>
          <p>
            <strong>Sub-processors only.</strong> The infrastructure providers listed in §4
            (Firebase, MongoDB Atlas, Google Cloud Storage, Vertex AI, Twelve Labs) process
            data on our behalf. We do not sell or rent your data to anyone. We do not use or
            transfer your data for purposes unrelated to the product's single purpose, and we
            do not use it to determine creditworthiness or for lending.
          </p>
        </Section>

        <Section title="6. Cookies and similar technologies">
          <p>
            Annotate sets one cookie:{' '}
            <span className="mono">__session</span>, a Firebase session cookie used to keep
            you signed in. It is{' '}
            <span className="mono">HttpOnly</span>, <span className="mono">Secure</span>,{' '}
            <span className="mono">SameSite=Lax</span>, and expires 5 days after sign-in. We
            do not use analytics cookies, advertising cookies, or third-party cookies on the
            published clip pages.
          </p>
          <p>
            The extension may also set a dismiss-flag cookie (
            <span className="mono">annotate-ext-dismissed</span>) so we don't repeatedly nag
            you to install it.
          </p>
        </Section>

        <Section title="7. Your choices">
          <ul style={listStyle}>
            <li>
              <strong>Delete an annotation.</strong> Open any annotation you own and click
              Delete in the owner actions. The clip page, embedded media, and USC index entry
              are removed.
            </li>
            <li>
              <strong>Edit your profile.</strong> Visit{' '}
              <span className="mono">/u/&lt;handle&gt;/edit</span> to change your display
              name, handle, bio, or avatar.
            </li>
            <li>
              <strong>Delete your account.</strong> Email{' '}
              <a href="mailto:cjohnson@metisos.com" style={linkStyle}>
                cjohnson@metisos.com
              </a>{' '}
              and we will remove your user record and all annotations you own within 7 days.
            </li>
            <li>
              <strong>Sign out.</strong> From your profile menu, or by clearing cookies for
              annotate.metisos.co.
            </li>
            <li>
              <strong>Uninstall the extension.</strong>{' '}
              <span className="mono">chrome://extensions</span> → Remove. Uninstalling clears
              the local cache.
            </li>
          </ul>
        </Section>

        <Section title="8. Children">
          <p>
            Annotate is not directed at children under 13. We do not knowingly collect data
            from anyone under 13. If you believe a child has signed in, contact us and we
            will delete the account.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            Data in transit is encrypted via TLS. Session cookies are{' '}
            <span className="mono">HttpOnly</span> and{' '}
            <span className="mono">Secure</span>. Database backups are encrypted at rest by
            our infrastructure providers. No system is perfect — if you believe you've found
            a security issue, please email{' '}
            <a href="mailto:cjohnson@metisos.com" style={linkStyle}>
              cjohnson@metisos.com
            </a>{' '}
            before disclosure.
          </p>
        </Section>

        <Section title="10. Changes">
          <p>
            We may update this policy as the product evolves. When we make material changes,
            we'll update the "Last updated" date at the top of this page and, where
            appropriate, notify signed-in users in-app.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions, requests, or complaints:{' '}
            <a href="mailto:cjohnson@metisos.com" style={linkStyle}>
              cjohnson@metisos.com
            </a>
            .
          </p>
        </Section>
      </article>

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
        <div style={{ display: 'flex', gap: 22 }}>
          <Link href="/">Home</Link>
          <Link href="/install-extension">Install</Link>
        </div>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: '-0.015em',
          marginBottom: 12,
          color: 'var(--ink)',
        }}
      >
        {title}
      </h2>
      <div style={{ color: 'var(--ink-2)' }}>{children}</div>
    </section>
  );
}

const linkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  textDecoration: 'underline',
};

const listStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: '12px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
