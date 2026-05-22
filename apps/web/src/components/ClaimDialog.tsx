'use client';

import { useState } from 'react';
import { Flag } from './Icons';

export function ClaimDialog({
  clipSlug,
  defaultOriginalUrl,
}: {
  clipSlug: string;
  defaultOriginalUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/claims/${clipSlug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          claimantName: data.get('claimantName'),
          claimantEmail: data.get('claimantEmail'),
          originalContentUrl: data.get('originalContentUrl'),
          reason: data.get('reason'),
          evidence: data.get('evidence'),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to file claim');
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to file claim');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn--ghost" onClick={() => setOpen(true)}>
        <Flag size={14} /> File a claim
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,18,14,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 50,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 14,
              padding: 28,
              boxShadow: '0 30px 80px rgba(0,0,0,0.2)',
            }}
          >
            {done ? (
              <div>
                <div className="eyebrow">Claim filed</div>
                <h2
                  className="serif"
                  style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.025em', marginTop: 8 }}
                >
                  Thanks. A human will review.
                </h2>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 12, lineHeight: 1.55 }}>
                  We'll email <span className="mono">{String(new FormData()).slice(0, 0)}</span>
                  the contact you provided once we've made a determination. The annotation now shows a
                  notice that a claim is under review.
                </p>
                <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setOpen(false)}>Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="eyebrow">Fair use claim</div>
                <h2
                  className="serif"
                  style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.025em', marginTop: 8 }}
                >
                  File a claim on this annotation.
                </h2>
                <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.55 }}>
                  Use this form only if you're the rights holder of the original content. We review
                  every claim manually.
                </p>

                <div style={{ display: 'grid', gap: 14, marginTop: 22 }}>
                  <Field label="Your name" name="claimantName" required />
                  <Field label="Email" name="claimantEmail" type="email" required />
                  <Field
                    label="Original content URL"
                    name="originalContentUrl"
                    type="url"
                    required
                    defaultValue={defaultOriginalUrl}
                  />
                  <Field label="Reason for claim" name="reason" required multiline />
                  <Field label="Supporting evidence (optional)" name="evidence" multiline />
                </div>

                {error && (
                  <div className="mono" style={{ marginTop: 14, fontSize: 11.5, color: '#c8321c' }}>
                    {error}
                  </div>
                )}

                <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setOpen(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--accent" disabled={busy}>
                    {busy ? 'Filing…' : 'File claim'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  multiline,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  multiline?: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--f-ui)',
    fontSize: 14,
    padding: '10px 12px',
    background: 'var(--paper-2)',
    border: '1px solid var(--rule-2)',
    borderRadius: 8,
    color: 'var(--ink)',
    width: '100%',
    outline: 'none',
  };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
      {multiline ? (
        <textarea
          name={name}
          required={required}
          defaultValue={defaultValue}
          rows={3}
          style={{ ...baseStyle, resize: 'vertical', minHeight: 72 }}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          defaultValue={defaultValue}
          style={baseStyle}
        />
      )}
    </label>
  );
}
