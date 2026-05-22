'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase-client';

export type SignInMode = 'sign-in' | 'sign-up';

export function SignInClient({ mode = 'sign-in' }: { mode?: SignInMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const fromExt = params.get('from') === 'ext';
  const redirectUri = params.get('redirect_uri') ?? undefined;
  const next = params.get('next');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';
  const title = isSignUp ? 'Create your account' : 'Welcome back';
  const cta = isSignUp ? 'Sign up with Google' : 'Continue with Google';

  async function go() {
    setError(null);
    setBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'verify failed');
      const { user } = (await res.json()) as { user: { handle: string } };

      if (fromExt && redirectUri) {
        const url = new URL(redirectUri);
        url.hash = new URLSearchParams({
          id_token: idToken,
          handle: user.handle,
        }).toString();
        window.location.href = url.toString();
        return;
      }
      router.push(next && next.startsWith('/') ? next : `/u/${user.handle}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      // Suppress "popup closed by user" noise
      if (!msg.includes('auth/popup-closed-by-user') && !msg.includes('cancelled')) {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <h1
        className="serif"
        style={{ fontSize: 40, letterSpacing: '-0.03em', lineHeight: 1.05, fontWeight: 500 }}
      >
        {title}
      </h1>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', marginTop: 12 }}>
        {isSignUp
          ? 'Annotate any moment on the web — and share what you think about it.'
          : 'Sign in to keep clipping, annotating, and sharing.'}
      </p>

      <button
        onClick={go}
        disabled={busy}
        className="btn"
        style={{
          marginTop: 28,
          height: 48,
          width: '100%',
          justifyContent: 'center',
          fontSize: 14,
        }}
      >
        <GoogleGlyph />
        {busy ? 'One moment…' : cta}
      </button>

      {error && (
        <div className="mono" style={{ marginTop: 18, fontSize: 11.5, color: '#c8321c' }}>
          {error}
        </div>
      )}

      {fromExt && (
        <div className="mono" style={{ marginTop: 24, fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
          Signing in from the Chrome extension.
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#fff"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.703-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#fff"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.583-5.036-3.71H.957v2.331A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#fff"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.963H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.037l3.007-2.331Z"
      />
      <path
        fill="#fff"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.963L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
