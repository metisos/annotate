'use client';

import { useEffect, useRef, useState } from 'react';

interface ShareLink {
  key: string;
  label: string;
  build: (url: string, title: string) => string;
  color?: string;
}

const LINKS: ShareLink[] = [
  {
    key: 'x',
    label: 'X',
    build: (url, title) =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    build: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    key: 'reddit',
    label: 'Reddit',
    build: (url, title) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    key: 'threads',
    label: 'Threads',
    build: (url, title) =>
      `https://www.threads.net/intent/post?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    key: 'bluesky',
    label: 'Bluesky',
    build: (url, title) =>
      `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    key: 'email',
    label: 'Email',
    build: (url, title) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
];

export function ShareDialog({
  slug,
  url,
  title,
}: {
  slug: string;
  url: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function track(channel: string) {
    try {
      await fetch(`/api/clips/${slug}/share`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
    } catch {
      /* best-effort */
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      void track('copy');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function onIntent(link: ShareLink) {
    const target = link.build(url, title);
    void track(link.key);
    window.open(target, '_blank', 'noopener,noreferrer,width=600,height=620');
    setOpen(false);
  }

  async function onNativeShare() {
    try {
      await navigator.share({ title, text: title, url });
      void track('native');
      setOpen(false);
    } catch {
      /* cancelled */
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', width: '100%' }}>
      <button
        ref={buttonRef}
        className="btn btn--ghost btn--sm"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Share link
      </button>
      {open && (
        <div
          ref={popoverRef}
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 60,
            background: 'var(--paper-2)',
            border: '1px solid var(--rule)',
            borderRadius: 10,
            padding: 6,
            minWidth: 200,
            boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Item label={copied ? 'Copied' : 'Copy link'} onClick={onCopy} />
          {hasNativeShare && <Item label="Share via…" onClick={onNativeShare} />}
          <Divider />
          {LINKS.map((l) => (
            <Item key={l.key} label={l.label} onClick={() => onIntent(l)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Item({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '8px 10px',
        fontSize: 13,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        borderRadius: 6,
        color: 'var(--ink)',
        fontFamily: 'var(--f-ui)',
        transition: 'background .08s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-3)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--rule)', margin: '4px 4px' }} />;
}
