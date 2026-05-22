import type { ReactNode } from 'react';

export function PullQuote({
  children,
  attribution,
}: {
  children: ReactNode;
  attribution?: string;
}) {
  return (
    <figure style={{ position: 'relative', padding: '24px 0 24px 28px', borderLeft: '2px solid var(--theme)' }}>
      <span
        aria-hidden
        className="serif-i"
        style={{
          position: 'absolute',
          left: -2,
          top: 4,
          fontSize: 84,
          color: 'var(--theme)',
          lineHeight: 0.6,
          transform: 'translateX(-58%)',
        }}
      >
        “
      </span>
      <blockquote
        className="serif"
        style={{
          margin: 0,
          fontSize: 32,
          lineHeight: 1.18,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
        }}
      >
        {children}
      </blockquote>
      {attribution && (
        <figcaption className="eyebrow" style={{ marginTop: 14 }}>
          {attribution}
        </figcaption>
      )}
    </figure>
  );
}
