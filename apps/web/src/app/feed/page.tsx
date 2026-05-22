import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { fetchFeed } from '@/lib/feed';
import { SiteHeader } from '@/components/SiteHeader';
import { FeedList } from '@/components/FeedList';
import { InstallExtensionBanner } from '@/components/InstallExtensionBanner';
import type { AvatarTone } from '@/components/Avatar';

export const dynamic = 'force-dynamic';

const TONES: AvatarTone[] = ['orange', 'blue', 'green', 'purple', 'ink', 'slate', 'cyan', 'red'];
function toneFor(seed: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const me = await getSessionUser();
  const requested = tab === 'following' ? 'following' : 'public';
  const activeTab: 'public' | 'following' = requested === 'following' && me ? 'following' : 'public';

  const page = await fetchFeed({
    scope: activeTab,
    viewerId: me ? String(me._id) : undefined,
    limit: 24,
  });
  const endpoint = activeTab === 'following' ? '/api/feed/following' : '/api/clips';

  return (
    <div className="ann" style={{ minHeight: '100dvh' }}>
      <SiteHeader user={me ? { name: me.displayName, handle: me.handle, tone: toneFor(me.handle), avatarUrl: me.avatarUrl } : undefined} />
      {me && <InstallExtensionBanner />}

      <section style={{ padding: '24px 40px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="kicker">§ feed</span>
        <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}
        >
          /FEED
        </span>
      </section>

      <section style={{ padding: '32px 40px 0', maxWidth: 1280, margin: '0 auto' }}>
        <h1
          className="serif"
          style={{ fontSize: 56, lineHeight: 0.98, letterSpacing: '-0.035em', fontWeight: 500 }}
        >
          {activeTab === 'following' ? 'From people you follow' : 'Recent annotations'}
        </h1>
        <p
          className="serif-i"
          style={{ fontSize: 20, lineHeight: 1.45, color: 'var(--ink-2)', marginTop: 14, maxWidth: 680 }}
        >
          What people are clipping, annotating, and publishing — across the web.
        </p>

        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--rule)' }}>
          <Tab href="/feed" active={activeTab === 'public'} label="Everyone" />
          {me && <Tab href="/feed?tab=following" active={activeTab === 'following'} label="Following" />}
        </div>
      </section>

      <section style={{ padding: '24px 40px 64px', maxWidth: 1280, margin: '0 auto' }}>
        {page.clips.length === 0 ? (
          <div
            style={{
              padding: '40px 24px',
              background: 'var(--paper-2)',
              border: '1px dashed var(--rule-2)',
              borderRadius: 12,
              textAlign: 'center',
            }}
          >
            <div className="serif-i" style={{ fontSize: 20, color: 'var(--ink-2)' }}>
              {activeTab === 'following'
                ? 'No annotations from people you follow yet.'
                : 'The feed is empty.'}
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 10 }}>
              {activeTab === 'following'
                ? 'Follow someone to see their annotations here.'
                : 'Publish the first annotation from the Chrome sidebar.'}
            </p>
          </div>
        ) : (
          <FeedList
            initial={page.clips}
            initialNextCursor={page.nextCursor}
            endpoint={endpoint}
          />
        )}
      </section>
    </div>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      style={{
        padding: '12px 16px',
        fontSize: 13,
        fontWeight: 500,
        color: active ? 'var(--ink)' : 'var(--ink-3)',
        borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        marginBottom: -1,
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  );
}
