'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut as fbSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

export function SignOutButton({ className = 'btn btn--ghost btn--sm' }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await Promise.allSettled([
        fbSignOut(auth),
        fetch('/api/auth/signout', { method: 'POST' }),
      ]);
      router.replace('/sign-in');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={className} onClick={signOut} disabled={busy}>
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
