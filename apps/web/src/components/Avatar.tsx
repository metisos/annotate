export type AvatarTone = 'orange' | 'blue' | 'green' | 'purple' | 'ink' | 'slate' | 'cyan' | 'red';

const TONES: Record<AvatarTone, [string, string]> = {
  orange: ['#fbe5d8', '#d34a1c'],
  blue:   ['#dfe5f7', '#1f4ed8'],
  green:  ['#d6e8db', '#2f7a4a'],
  purple: ['#e6dbf2', '#6b3aa0'],
  ink:    ['#dcd6c8', '#14120e'],
  slate:  ['#e1ddd0', '#4a463f'],
  cyan:   ['#cfe4e7', '#0a7d8c'],
  red:    ['#f4d4cd', '#a73218'],
};

export function Avatar({
  name = 'AB',
  tone = 'orange',
  size = 32,
  square = false,
  src,
}: {
  name?: string;
  tone?: AvatarTone;
  size?: number;
  square?: boolean;
  src?: string | null;
}) {
  const [bg, fg] = TONES[tone];
  const radius = square ? size * 0.18 : size;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: 'cover',
          flex: '0 0 auto',
          display: 'block',
          background: bg,
        }}
      />
    );
  }

  const initials = (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--f-display)',
        fontWeight: 500,
        fontSize: size * 0.42,
        letterSpacing: '-0.02em',
        flex: '0 0 auto',
      }}
    >
      {initials}
    </div>
  );
}
