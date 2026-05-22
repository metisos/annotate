import Link from 'next/link';
import type { Annotation } from '@annotate/shared';
import { THEMES } from '@annotate/shared';
import type { UscHit } from '@/lib/usc/types';

export function RelatedClips({
  items,
  external = [],
}: {
  items: Array<{ annotation: Annotation; score: number }>;
  external?: UscHit[];
}) {
  if (items.length === 0 && external.length === 0) return null;
  return (
    <section>
      <div className="eyebrow" style={{ marginBottom: 14 }}>More like this</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {items.map(({ annotation }) => (
          <InternalCard key={annotation.slug} annotation={annotation} />
        ))}
        {external.map((hit) => (
          <ExternalCard key={hit.primitive.identifier} hit={hit} />
        ))}
      </div>
    </section>
  );
}

function InternalCard({ annotation }: { annotation: Annotation }) {
  const theme = annotation.pageDesign?.theme ?? 'conversation';
  const themeColor = THEMES[theme].accentColor;
  const pageTitle = annotation.pageDesign?.pageTitle ?? annotation.source.title;
  const thumb = annotation.clip?.thumbnailUrl ?? annotation.source.ogImage ?? null;
  return (
    <Link
      href={`/clip/${annotation.slug}`}
      style={{
        display: 'block',
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 10,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <Thumb thumb={thumb} themeColor={themeColor} themeLabel={theme} type={annotation.type} />
      <div style={{ padding: 12 }}>
        <div
          className="serif"
          style={{
            fontSize: 14,
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {pageTitle}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6 }}>
          {annotation.source.domain}
        </div>
      </div>
    </Link>
  );
}

function ExternalCard({ hit }: { hit: UscHit }) {
  const p = hit.primitive;
  const payload = (p.payload ?? {}) as {
    pageTitle?: string;
    source?: { domain?: string };
  };
  const title = payload.pageTitle ?? p.provenance.source_uri;
  const domain = payload.source?.domain ?? '';
  const platform = p.identifier.split(':')[0] ?? 'usc';
  return (
    <a
      href={p.provenance.source_uri}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 10,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          aspectRatio: '16/9',
          background: `linear-gradient(135deg, var(--paper-3), var(--rule))`,
          display: 'flex',
          alignItems: 'flex-end',
          padding: 10,
          position: 'relative',
        }}
      >
        <span
          className="mono"
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#fff',
            background: 'rgba(20,18,14,0.6)',
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          via {platform}
        </span>
      </div>
      <div style={{ padding: 12 }}>
        <div
          className="serif"
          style={{
            fontSize: 14,
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
        {domain && (
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6 }}>
            {domain}
          </div>
        )}
      </div>
    </a>
  );
}

function Thumb({
  thumb,
  themeColor,
  themeLabel,
  type,
}: {
  thumb: string | null;
  themeColor: string;
  themeLabel: string;
  type: Annotation['type'];
}) {
  return (
    <div
      style={{
        aspectRatio: '16/9',
        background: 'var(--paper-3)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, var(--theme-tint), var(--theme-soft))`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--theme-deep)',
            fontFamily: 'var(--f-display)',
            fontStyle: 'italic',
            fontSize: 28,
            opacity: 0.6,
          }}
        >
          {type === 'text' ? '“ ”' : type === 'audio' ? '♪' : '▸'}
        </div>
      )}
      <span
        className="mono"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#fff',
          background: 'rgba(20,18,14,0.6)',
          padding: '2px 6px',
          borderRadius: 3,
        }}
      >
        <span>{themeLabel}</span>
        <span style={{ marginLeft: 5, color: themeColor }}>●</span>
      </span>
    </div>
  );
}
