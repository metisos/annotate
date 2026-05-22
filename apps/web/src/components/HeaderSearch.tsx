'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search } from './Icons';

export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {!open ? (
        <button
          aria-label="Search"
          onClick={() => setOpen(true)}
          style={{ color: 'var(--ink-2)', background: 'none', border: 0, cursor: 'pointer', padding: 4 }}
        >
          <Search />
        </button>
      ) : (
        <form onSubmit={submit}>
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search annotations…"
            style={{
              width: 240,
              height: 32,
              padding: '0 12px',
              fontFamily: 'var(--f-ui)',
              fontSize: 13,
              background: 'var(--paper-2)',
              border: '1px solid var(--rule-2)',
              borderRadius: 16,
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
        </form>
      )}
    </div>
  );
}
