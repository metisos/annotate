import type { ReactNode } from 'react';

type IconProps = {
  size?: number;
  strokeWidth?: number;
  fill?: string;
};

function Svg({
  size = 16,
  strokeWidth = 1.5,
  fill = 'none',
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const Scissors = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.12 8.12 20 20M14.12 14.12 20 4" />
  </Svg>
);
export const Sparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </Svg>
);
export const Search = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5" />
  </Svg>
);
export const ArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </Svg>
);
export const ArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5m5-5-5 5 5 5" />
  </Svg>
);
export const Play = (p: IconProps) => (
  <Svg strokeWidth={1} fill="currentColor" {...p}>
    <path d="M7 5v14l12-7L7 5Z" />
  </Svg>
);
export const Share = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8M16 6l-4-4-4 4M12 2v14" />
  </Svg>
);
export const Bell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 3h16l-2-3ZM10 21a2 2 0 0 0 4 0" />
  </Svg>
);
export const Chat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4l-5 1 1-5a8.4 8.4 0 1 1 13-4.4Z" />
  </Svg>
);
export const Heart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6C19 16.5 12 21 12 21Z" />
  </Svg>
);
export const Flag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21V4m0 0h13l-2 4 2 4H5" />
  </Svg>
);
export const Copy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 8h11v13H8zM5 16V3h11" />
  </Svg>
);
export const External = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4 10 14M9 5H5v14h14v-4" />
  </Svg>
);
export const Mic = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-7-3a7 7 0 0 0 14 0M12 19v3" />
  </Svg>
);
export const Source = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 17v-7a3 3 0 0 1 3-3h6M19 7l-3-3M19 7l-3 3M5 21h14" />
  </Svg>
);
