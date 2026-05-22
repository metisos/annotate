export function Wordmark({
  variant = 'serif',
  size = 20,
}: {
  variant?: 'serif' | 'bracket' | 'caps';
  size?: number;
}) {
  if (variant === 'bracket') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="mono" style={{ fontSize: size, color: 'var(--accent)', fontWeight: 400, lineHeight: 1 }}>
          [
        </span>
        <span style={{ fontSize: size, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--ink)', lineHeight: 1 }}>
          annotate
        </span>
        <span className="mono" style={{ fontSize: size, color: 'var(--accent)', fontWeight: 400, lineHeight: 1 }}>
          ]
        </span>
      </div>
    );
  }
  if (variant === 'caps') {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
        <span
          className="serif"
          style={{
            fontSize: size,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
          }}
        >
          Annotate
        </span>
        <span className="serif-i" style={{ fontSize: size, color: 'var(--accent)', lineHeight: 1, marginLeft: -size * 0.18 }}>
          ·
        </span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
      <span
        className="serif"
        style={{ fontSize: size, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--ink)' }}
      >
        Annotate
      </span>
      <span className="serif-i" style={{ fontSize: size, color: 'var(--accent)', marginLeft: 1, lineHeight: 1 }}>
        .
      </span>
    </div>
  );
}
