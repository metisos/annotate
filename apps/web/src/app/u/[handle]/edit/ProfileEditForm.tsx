'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AvatarCropper } from '@/components/AvatarCropper';

interface FormState {
  handle: string;
  displayName: string;
  bio: string;
  link: string;
  avatarUrl: string;
}

export function ProfileEditForm({ initial }: { initial: FormState }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadAvatar(blob: Blob): Promise<void> {
    const fd = new FormData();
    fd.append('file', blob, 'avatar.jpg');
    const res = await fetch('/api/users/avatar', {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? 'Upload failed');
    }
    const { avatarUrl } = (await res.json()) as { avatarUrl: string };
    set('avatarUrl', avatarUrl);
    setSavedField('photo');
    router.refresh();
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        handle: form.handle.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        link: form.link.trim(),
      };
      const res = await fetch(`/api/users/${initial.handle}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Save failed (HTTP ${res.status})`);
      }
      const { user } = (await res.json()) as { user: { handle: string } };
      if (user.handle !== initial.handle) {
        // Handle changed — navigate to new URL
        router.push(`/u/${user.handle}`);
      } else {
        setSavedField('all');
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    form.handle.trim().toLowerCase() !== initial.handle ||
    form.displayName.trim() !== initial.displayName ||
    form.bio.trim() !== (initial.bio ?? '') ||
    form.link.trim() !== (initial.link ?? '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36, marginTop: 40 }}>
      <Section title="Photo">
        <AvatarCropper currentUrl={form.avatarUrl || undefined} onUpload={uploadAvatar} />
      </Section>

      <Section title="Identity">
        <Field
          label="Handle"
          mono
          prefix="@"
          value={form.handle}
          onChange={(v) => set('handle', v.toLowerCase())}
          hint="3-20 lowercase letters, numbers, or hyphens. Must start with a letter."
        />
        <Field
          label="Display name"
          value={form.displayName}
          onChange={(v) => set('displayName', v)}
          maxLength={60}
        />
      </Section>

      <Section title="About">
        <Field
          label="Bio"
          multiline
          value={form.bio}
          onChange={(v) => set('bio', v)}
          maxLength={280}
          hint={`${form.bio.length} / 280`}
        />
        <Field
          label="Link"
          value={form.link}
          onChange={(v) => set('link', v)}
          placeholder="https://your-site.com"
          hint="Optional — appears under your handle on your profile."
        />
      </Section>

      {error && (
        <div className="mono" style={{ fontSize: 12, color: '#c8321c' }}>
          {error}
        </div>
      )}

      {savedField === 'all' && !error && !busy && (
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          Saved.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => router.push(`/u/${initial.handle}`)}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--accent"
          onClick={save}
          disabled={busy || !dirty}
        >
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="eyebrow" style={{ marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  prefix,
  multiline,
  maxLength,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  prefix?: string;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  mono?: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontFamily: mono ? 'var(--f-mono)' : 'var(--f-ui)',
    fontSize: 14,
    lineHeight: 1.55,
    background: 'var(--paper-2)',
    border: '1px solid var(--rule-2)',
    borderRadius: 8,
    color: 'var(--ink)',
    outline: 'none',
  };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          maxLength={maxLength}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {prefix && (
            <div
              className="mono"
              style={{
                padding: '10px 8px 10px 12px',
                background: 'var(--paper-3)',
                border: '1px solid var(--rule-2)',
                borderRight: 0,
                borderRadius: '8px 0 0 8px',
                color: 'var(--ink-3)',
                fontSize: 14,
              }}
            >
              {prefix}
            </div>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            style={{
              ...inputStyle,
              ...(prefix ? { borderRadius: '0 8px 8px 0', borderLeft: 0 } : {}),
            }}
          />
        </div>
      )}
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{hint}</span>
      )}
    </label>
  );
}
