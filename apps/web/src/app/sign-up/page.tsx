import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SignInClient } from '../sign-in/SignInClient';
import { Wordmark } from '@/components/Wordmark';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign up — Annotate' };

export default async function SignUpPage() {
  const me = await getSessionUser();
  if (me) redirect(`/u/${me.handle}`);

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper)',
      }}
    >
      <header
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <Link href="/">
          <Wordmark variant="serif" size={20} />
        </Link>
        <Link href="/sign-in" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Already have an account? <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</span>
        </Link>
      </header>

      <section
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <Suspense fallback={null}>
            <SignInClient mode="sign-up" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
