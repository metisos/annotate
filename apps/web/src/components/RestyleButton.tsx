'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Sparkle } from './Icons';

export function RestyleButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/restyle/${slug}`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Restyle failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restyle failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <button className="btn btn--ghost btn--sm" onClick={go} disabled={busy}>
        <Sparkle size={14} /> {busy ? 'Restyling…' : 'Restyle with AI'}
      </button>
      {error && (
        <span className="mono" style={{ fontSize: 11, color: '#c8321c' }}>
          {error}
        </span>
      )}
    </span>
  );
}
