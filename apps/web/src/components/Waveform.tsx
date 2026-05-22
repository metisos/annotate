export function Waveform({
  bars = 64,
  height = 36,
  active = 0,
  end = 1,
  color = 'currentColor',
  dim = 'rgba(0,0,0,.15)',
}: {
  bars?: number;
  height?: number;
  active?: number;
  end?: number;
  color?: string;
  dim?: string;
}) {
  const h = Array.from({ length: bars }, (_, i) => {
    const v =
      Math.sin(i * 0.41 + 1.2) * 0.5 +
      Math.sin(i * 0.17 + 4) * 0.35 +
      Math.sin(i * 0.77) * 0.15;
    return Math.max(0.08, Math.min(1, 0.55 + v * 0.45));
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height, width: '100%' }}>
      {h.map((v, i) => {
        const t = i / bars;
        const inRange = t >= active && t <= end;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${v * 100}%`,
              background: inRange ? color : dim,
              borderRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
}
