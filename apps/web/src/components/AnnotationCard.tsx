import Link from 'next/link';
import type { Annotation } from '@annotate/shared';
import { THEMES } from '@annotate/shared';

function timeAgo(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function thumbnailFor(annotation: Annotation): { src: string | null; isCinematic: boolean } {
  if (annotation.type === 'video' && annotation.clip?.thumbnailUrl) {
    return { src: annotation.clip.thumbnailUrl, isCinematic: true };
  }
  if (annotation.source.ogImage) {
    return { src: annotation.source.ogImage, isCinematic: annotation.type === 'video' };
  }
  return { src: null, isCinematic: false };
}

export function AnnotationCard({ annotation }: { annotation: Annotation }) {
  const theme = annotation.pageDesign?.theme ?? 'conversation';
  const themeColor = THEMES[theme].accentColor;
  const pageTitle = annotation.pageDesign?.pageTitle ?? annotation.source.title;
  const { src: thumbSrc, isCinematic } = thumbnailFor(annotation);

  return (
    <Link
      href={`/clip/${annotation.slug}`}
      data-theme={theme}
      style={{
        display: 'block',
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 12,
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
      }}
    >
      <ThumbBlock
        annotation={annotation}
        src={thumbSrc}
        isCinematic={isCinematic}
        themeColor={themeColor}
      />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className="mono"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: themeColor,
            }}
          >
            § {theme}
          </span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
            · {annotation.source.domain}
          </span>
          <span style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
            {timeAgo(annotation.createdAt)}
          </span>
        </div>
        <h3
          className="serif"
          style={{
            fontSize: 22,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            fontWeight: 500,
            marginTop: 12,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {pageTitle}
        </h3>
        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--ink-2)',
            marginTop: 10,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {annotation.commentary.text}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 14,
            color: 'var(--ink-3)',
            fontSize: 11.5,
          }}
        >
          <span>{annotation.stats.votes ?? 0} votes</span>
          <span>{annotation.stats.views} views</span>
          <span>{annotation.stats.comments} comments</span>
        </div>
      </div>
    </Link>
  );
}

function ThumbBlock({
  annotation,
  src,
  isCinematic,
  themeColor,
}: {
  annotation: Annotation;
  src: string | null;
  isCinematic: boolean;
  themeColor: string;
}) {
  if (src) {
    return (
      <div
        style={{
          aspectRatio: isCinematic ? '16/9' : '16/9',
          background: '#0e0c08',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <TypeBadge type={annotation.type} themeColor={themeColor} />
      </div>
    );
  }
  // No thumbnail — use a theme-tinted block with the type label
  return (
    <div
      style={{
        aspectRatio: '16/9',
        background: `linear-gradient(135deg, var(--theme-tint), var(--theme-soft))`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        className="serif-i"
        style={{
          fontSize: 36,
          letterSpacing: '-0.02em',
          color: 'var(--theme-deep)',
          opacity: 0.55,
        }}
      >
        {annotation.type === 'text'
          ? '“ ”'
          : annotation.type === 'audio'
            ? '♪'
            : '▸'}
      </span>
      <TypeBadge type={annotation.type} themeColor={themeColor} />
    </div>
  );
}

function TypeBadge({ type, themeColor }: { type: 'video' | 'audio' | 'text'; themeColor: string }) {
  return (
    <span
      className="mono"
      style={{
        position: 'absolute',
        top: 10,
        left: 12,
        fontSize: 9.5,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#fff',
        background: 'rgba(20,18,14,0.55)',
        padding: '3px 8px',
        borderRadius: 4,
        backdropFilter: 'blur(4px)',
      }}
    >
      {type}
      <span style={{ marginLeft: 6, color: themeColor }}>●</span>
    </span>
  );
}
