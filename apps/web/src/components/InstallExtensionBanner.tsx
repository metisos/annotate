'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const COOKIE_KEY = 'annotate-ext-dismissed';
const CHROME_STORE_URL = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL ?? '/install-extension';

function hasDismissed(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.startsWith(`${COOKIE_KEY}=1`));
}

function setDismissed() {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_KEY}=1; max-age=${oneYear}; path=/; samesite=lax`;
}

export function InstallExtensionBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!hasDismissed());
  }, []);

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Install the Annotate Chrome extension"
      style={{
        background: 'var(--paper-2)',
        borderBottom: '1px solid var(--rule)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ color: 'var(--accent)', flex: '0 0 auto' }}>⊹</span>
        <span style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Annotate clips happen in the Chrome side panel.{' '}
          <Link href={CHROME_STORE_URL} style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            Install the extension
          </Link>
          {' '}to start clipping.
        </span>
      </div>
      <button
        onClick={() => {
          setDismissed();
          setShow(false);
        }}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 0,
          color: 'var(--ink-3)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: '4px 8px',
          flex: '0 0 auto',
        }}
      >
        ×
      </button>
    </div>
  );
}
