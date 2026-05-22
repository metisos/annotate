'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function OwnerActions({ slug, ownerHandle }: { slug: string; ownerHandle?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm('Delete this annotation? This cannot be undone.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/clips/${slug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push(ownerHandle ? `/u/${ownerHandle}` : '/');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSave(text: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/clips/${slug}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commentary: { text } }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditing(false);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <EditForm
        onSave={onSave}
        onCancel={() => setEditing(false)}
        busy={busy}
        slug={slug}
      />
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
        Edit
      </button>
      <button className="btn btn--ghost btn--sm" onClick={onDelete} disabled={busy}>
        {busy ? 'Working…' : 'Delete'}
      </button>
    </div>
  );
}

function EditForm({
  onSave,
  onCancel,
  busy,
  slug,
}: {
  onSave: (text: string) => void;
  onCancel: () => void;
  busy: boolean;
  slug: string;
}) {
  const [text, setText] = useState('');
  // load current commentary on first render via the API
  useFetchCurrent(slug, setText);

  return (
    <div
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        style={{
          width: '100%',
          fontFamily: 'var(--f-display)',
          fontSize: 17,
          lineHeight: 1.5,
          padding: 12,
          border: '1px solid var(--rule-2)',
          borderRadius: 8,
          background: 'var(--paper)',
          resize: 'vertical',
          color: 'var(--ink)',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn--ghost btn--sm" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className="btn btn--accent btn--sm"
          onClick={() => onSave(text)}
          disabled={busy || !text.trim()}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function useFetchCurrent(slug: string, setText: (s: string) => void) {
  if (typeof window === 'undefined') return;
  const fetched = (window as unknown as { __annotateEditFetched?: Record<string, boolean> })
    .__annotateEditFetched ??= {};
  if (fetched[slug]) return;
  fetched[slug] = true;
  void fetch(`/api/clips/${slug}`)
    .then((r) => r.json())
    .then((j) => setText(j?.annotation?.commentary?.text ?? ''));
}
