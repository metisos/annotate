import Link from 'next/link';
import type { Annotation, Comment, User } from '@annotate/shared';
import { THEMES } from '@annotate/shared';
import type { UscHit } from '@/lib/usc/types';
import { Wordmark } from './Wordmark';
import { Avatar, type AvatarTone } from './Avatar';
import { ClipPlayer } from './ClipPlayer';
import { PullQuote } from './PullQuote';
import { ContextCard } from './ContextCard';
import { Copy, External, Search, Share } from './Icons';
import { ClaimDialog } from './ClaimDialog';
import { OwnerActions } from './OwnerActions';
import { RestyleButton } from './RestyleButton';
import { Comments } from './Comments';
import { FollowButton } from './FollowButton';
import { ShareDialog } from './ShareDialog';
import { RelatedClips } from './RelatedClips';
import { InstallExtensionBanner } from './InstallExtensionBanner';

const TONES: AvatarTone[] = ['orange', 'blue', 'green', 'purple', 'ink', 'slate', 'cyan', 'red'];
function toneFor(seed: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}

function fmtDate(d: Date | string | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AnnotationPage({
  annotation,
  author,
  viewer,
  comments,
  commentAuthors,
  amFollowing,
  related,
  relatedExternal,
}: {
  annotation: Annotation;
  author: User;
  viewer: User | null;
  comments: Comment[];
  commentAuthors: Record<string, { handle: string; displayName: string }>;
  amFollowing: boolean;
  related?: Array<{ annotation: Annotation; score: number }>;
  relatedExternal?: UscHit[];
}) {
  const isOwner = viewer?.firebaseUid === author.firebaseUid;
  const theme = annotation.pageDesign?.theme ?? 'conversation';
  const pageTitle = annotation.pageDesign?.pageTitle ?? annotation.source.title;
  const pullQuote = annotation.pageDesign?.pullQuote;
  const tone = toneFor(author.handle);
  const themeColor = THEMES[theme].accentColor;

  return (
    <article
      className="ann"
      data-theme={theme}
      style={{ background: 'var(--paper)', minHeight: '100dvh', paddingBottom: 80 }}
    >
      {/* Slim site bar */}
      <header
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/" aria-label="Annotate — home">
            <Wordmark variant="serif" size={20} />
          </Link>
          <nav style={{ display: 'flex', gap: 22, fontSize: 13, color: 'var(--ink-2)' }}>
            <Link href="/feed">Feed</Link>
            {viewer ? (
              <Link href={`/u/${viewer.handle}`}>Dashboard</Link>
            ) : (
              <Link href={`/u/${author.handle}`}>Profile</Link>
            )}
            <Link href="/install-extension">Extension</Link>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ color: 'var(--ink-2)', background: 'none', border: 0 }} aria-label="Search">
            <Search />
          </button>
          {viewer ? (
            <Link href={`/u/${viewer.handle}`} aria-label="Open your dashboard">
              <Avatar name={viewer.displayName} tone={toneFor(viewer.handle)} size={28} src={viewer.avatarUrl} />
            </Link>
          ) : (
            <Link href="/sign-in" className="btn btn--ghost btn--sm">
              Sign in
            </Link>
          )}
        </div>
      </header>
      {viewer && <InstallExtensionBanner />}

      {/* Theme tag rail */}
      <div style={{ padding: '24px 40px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="kicker">§ {theme}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}
        >
          /CLIP/{annotation.slug.toUpperCase()}
        </span>
      </div>

      {/* Hero */}
      <div
        style={{
          padding: '32px 40px 48px',
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 64,
          alignItems: 'end',
        }}
      >
        <div>
          <h1
            className="serif"
            style={{
              fontSize: 88,
              lineHeight: 0.96,
              letterSpacing: '-0.035em',
              fontWeight: 500,
              color: 'var(--ink)',
              maxWidth: 920,
              textWrap: 'pretty',
            }}
          >
            {pageTitle}
          </h1>
        </div>
        <div style={{ paddingBottom: 8 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Annotated by</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={author.displayName} tone={tone} size={44} src={author.avatarUrl} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Link href={`/u/${author.handle}`}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{author.displayName}</div>
              </Link>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                @{author.handle} · {author.followerCount} followers
              </div>
            </div>
            {viewer && viewer.firebaseUid !== author.firebaseUid && (
              <FollowButton
                targetHandle={author.handle}
                initialFollowing={amFollowing}
                canFollow={Boolean(viewer)}
              />
            )}
          </div>
          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid var(--rule)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div className="eyebrow" style={{ fontSize: 9.5 }}>Source</div>
              <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>
                {annotation.source.domain}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: 9.5 }}>Type</div>
              <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>{annotation.type}</div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: 9.5 }}>Published</div>
              <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>
                {fmtDate(annotation.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--rule-strong)', margin: '0 40px' }} />

      {/* Claim banner */}
      {annotation.claim?.filed && (
        <div
          style={{
            margin: '24px 40px 0',
            padding: '12px 16px',
            background: 'var(--paper-3)',
            border: '1px solid var(--rule-2)',
            borderLeft: `3px solid ${themeColor}`,
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
          A fair-use claim has been filed on this annotation and is under review.
        </div>
      )}

      {/* Body grid */}
      <div
        style={{
          padding: '48px 40px 0',
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 64,
        }}
      >
        {/* MAIN COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {/* Clip player */}
          {annotation.type === 'text' && annotation.textContent ? (
            <ClipPlayer type="text" text={annotation.textContent.selectedText} />
          ) : annotation.type === 'audio' ? (
            <ClipPlayer
              type="audio"
              start={annotation.clip ? String(annotation.clip.startTime) : undefined}
              end={annotation.clip ? String(annotation.clip.endTime) : undefined}
              duration={annotation.clip ? `${annotation.clip.duration}s` : undefined}
              mediaUrl={annotation.clip?.mediaUrl}
            />
          ) : (
            <ClipPlayer
              type="video"
              start={annotation.clip ? String(annotation.clip.startTime) : undefined}
              end={annotation.clip ? String(annotation.clip.endTime) : undefined}
              duration={annotation.clip ? `${annotation.clip.duration}s` : undefined}
              sourceTitle={annotation.source.title}
              pullQuote={pullQuote ?? undefined}
              mediaUrl={annotation.clip?.mediaUrl}
              thumbnailUrl={annotation.clip?.thumbnailUrl}
            />
          )}

          {/* Pull quote */}
          {pullQuote && (
            <div style={{ padding: '8px 8px 8px 0' }}>
              <PullQuote>“{pullQuote}”</PullQuote>
            </div>
          )}

          {/* Commentary */}
          <section>
            <div className="eyebrow">The Annotation</div>
            <div
              className="serif"
              style={{
                marginTop: 16,
                fontSize: 22,
                lineHeight: 1.5,
                letterSpacing: '-0.005em',
                color: 'var(--ink)',
                maxWidth: 760,
                textWrap: 'pretty',
                whiteSpace: 'pre-wrap',
              }}
            >
              {annotation.commentary.text}
            </div>
            {isOwner && (
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <OwnerActions slug={annotation.slug} ownerHandle={author.handle} />
                <RestyleButton slug={annotation.slug} />
              </div>
            )}
          </section>

          {/* Context cards */}
          {annotation.enrichment && annotation.enrichment.sources.length > 0 && (
            <section>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}
              >
                <div className="eyebrow">Context · enriched by Annotate Agent</div>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                  · {annotation.enrichment.sources.length} sources
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {annotation.enrichment.sources.map((s, i) => (
                  <ContextCard
                    key={i}
                    rel={s.relationship}
                    src={new URL(s.url).hostname.replace(/^www\./, '')}
                    title={s.title}
                    snippet={s.snippet}
                    url={s.url}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Related — USC-powered semantic neighbors */}
          {((related && related.length > 0) || (relatedExternal && relatedExternal.length > 0)) && (
            <RelatedClips items={related ?? []} external={relatedExternal ?? []} />
          )}

          {/* Comments */}
          <section>
            <Comments
              slug={annotation.slug}
              annotationId={String(annotation._id)}
              viewerId={viewer ? String(viewer._id) : null}
              initialComments={comments}
              initialAuthors={commentAuthors}
              canPost={Boolean(viewer)}
            />
          </section>

          {/* Fair use footer */}
          <section
            style={{
              marginTop: 24,
              padding: '20px 24px',
              background: 'var(--paper-3)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
            }}
          >
            <div style={{ maxWidth: 600 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Fair use</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                This annotation is published as commentary under fair use, linking back to the
                original source. If you are the rights holder, file a claim and a human will review.
              </div>
            </div>
            <ClaimDialog
              clipSlug={annotation.slug}
              defaultOriginalUrl={annotation.source.url}
            />
          </section>
        </div>

        {/* SIDEBAR */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingTop: 8 }}>
          {/* Share card */}
          <div
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div className="eyebrow">Share this annotation</div>
            <div
              className="serif"
              style={{ fontSize: 18, lineHeight: 1.25, marginTop: 10, letterSpacing: '-0.015em' }}
            >
              {pageTitle}
            </div>
            <div
              className="mono"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 14,
                padding: '8px 10px',
                background: 'var(--paper-3)',
                borderRadius: 6,
                color: 'var(--ink-2)',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                /clip/{annotation.slug}
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              <ShareDialog
                slug={annotation.slug}
                url={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/clip/${annotation.slug}`}
                title={pageTitle}
              />
            </div>
          </div>

          {/* Source card */}
          <div
            style={{
              borderRadius: 12,
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: 120,
                background: 'linear-gradient(135deg,#0e0c08 0%,#3a2a1c 100%)',
                position: 'relative',
                color: '#fff',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 14,
              }}
            >
              <div
                className="mono"
                style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                {annotation.source.domain}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div className="eyebrow">Original source</div>
              <div
                className="serif"
                style={{
                  fontSize: 17,
                  marginTop: 8,
                  lineHeight: 1.25,
                  letterSpacing: '-0.015em',
                }}
              >
                {annotation.source.title}
              </div>
              <a
                href={annotation.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost btn--sm"
                style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
              >
                <External size={14} /> Visit original
              </a>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              ['Views', annotation.stats.views],
              ['Comments', annotation.stats.comments],
              ['Shares', annotation.stats.shares],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <div className="eyebrow" style={{ fontSize: 9.5 }}>{k}</div>
                <div className="serif" style={{ fontSize: 28, marginTop: 4, letterSpacing: '-0.02em' }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}
