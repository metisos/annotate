import Link from 'next/link';
import { Wordmark } from './Wordmark';
import { Avatar, type AvatarTone } from './Avatar';
import { HeaderSearch } from './HeaderSearch';

export function SiteHeader({
  user,
}: {
  user?: { name: string; handle?: string; tone?: AvatarTone; avatarUrl?: string | null };
}) {
  return (
    <header
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link href="/" aria-label="Annotate — home">
          <Wordmark variant="serif" size={20} />
        </Link>
        <nav style={{ display: 'flex', gap: 22, fontSize: 13, color: 'var(--ink-2)' }}>
          <Link href="/feed">Feed</Link>
          {user?.handle && <Link href={`/u/${user.handle}`}>Dashboard</Link>}
          <Link href="/install-extension">Extension</Link>
          <Link href="/portal">Portal</Link>
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <HeaderSearch />
        {user ? (
          <Link
            href={user.handle ? `/u/${user.handle}` : '/'}
            aria-label={user.handle ? `Open ${user.name}'s dashboard` : 'Open profile'}
          >
            <Avatar
              name={user.name}
              tone={user.tone ?? 'orange'}
              size={28}
              src={user.avatarUrl ?? undefined}
            />
          </Link>
        ) : (
          <Link href="/sign-in" className="btn btn--ghost btn--sm">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
