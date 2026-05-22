import { External } from './Icons';
import type { EnrichmentRelationship } from '@annotate/shared';

const LABELS: Record<EnrichmentRelationship, { label: string; color: string; glyph: string }> = {
  supports:    { label: 'SUPPORTS',    color: '#2f7a4a', glyph: '✓' },
  contradicts: { label: 'CONTRADICTS', color: '#c8321c', glyph: '⊘' },
  context:     { label: 'CONTEXT',     color: '#4a463f', glyph: '·' },
};

export function ContextCard({
  rel,
  src,
  title,
  snippet,
  url,
}: {
  rel: EnrichmentRelationship;
  src: string;
  title: string;
  snippet?: string;
  url?: string;
}) {
  const { label, color, glyph } = LABELS[rel];
  const Wrapper = url ? 'a' : 'div';
  return (
    <Wrapper
      {...(url ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : {})}
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 140,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color }}>
          {glyph} {label}
        </span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{src}</span>
      </div>
      <div className="serif" style={{ fontSize: 16, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
        {title}
      </div>
      {snippet && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{snippet}</div>
      )}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--ink-3)',
          fontSize: 11,
        }}
      >
        <External size={12} />
        <span>Read source</span>
      </div>
    </Wrapper>
  );
}
