import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { annotations, follows, users } from '@/lib/mongo';
import { getSessionUser } from '@/lib/auth';
import { resolveCurrentHandle } from '@/lib/handle-history';
import { SiteHeader } from '@/components/SiteHeader';
import { Avatar, type AvatarTone } from '@/components/Avatar';
import { SignOutButton } from '@/components/SignOutButton';
import { AnnotationCard } from '@/components/AnnotationCard';
import { FollowButton } from '@/components/FollowButton';
import { InstallExtensionBanner } from '@/components/InstallExtensionBanner';

export const dynamic = 'force-dynamic';

const TONES: AvatarTone[] = ['orange', 'blue', 'green', 'purple', 'ink', 'slate', 'cyan', 'red'];
function toneFor(seed: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const usersCol = await users();
  const profile = await usersCol.findOne({ handle: handle.toLowerCase() });
  if (!profile) {
    // Maybe this is an old handle — check the redirect history.
    const renamed = await resolveCurrentHandle(handle);
    if (renamed) redirect(`/u/${renamed}`);
    notFound();
  }

  const me = await getSessionUser();
  const isMe = me?.firebaseUid === profile.firebaseUid;

  let amFollowing = false;
  if (me && !isMe) {
    const f = await (await follows()).findOne({
      followerId: String(me._id),
      followingId: String(profile._id),
    });
    amFollowing = Boolean(f);
  }

  const annsCol = await annotations();
  const userAnns = await annsCol
    .find({ userId: String(profile._id), status: 'ready' })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const tone = toneFor(profile.handle);

  return (
    <div className="ann" style={{ minHeight: '100dvh' }}>
      <SiteHeader user={me ? { name: me.displayName, handle: me.handle, tone: toneFor(me.handle), avatarUrl: me.avatarUrl } : undefined} />
      {isMe && <InstallExtensionBanner />}

      <section style={{ padding: '24px 40px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="kicker">§ profile</span>
        <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}
        >
          /U/{profile.handle.toUpperCase()}
        </span>
      </section>

      <section
        style={{
          padding: '32px 40px 48px',
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 64,
          alignItems: 'end',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Avatar name={profile.displayName} tone={tone} size={88} src={profile.avatarUrl} />
          <div>
            <h1
              className="serif"
              style={{ fontSize: 56, lineHeight: 0.98, letterSpacing: '-0.035em', fontWeight: 500 }}
            >
              {profile.displayName}
            </h1>
            <div
              className="mono"
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
              }}
            >
              @{profile.handle}
            </div>
          </div>
        </div>
        <div style={{ paddingBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              ['Annotations', profile.annotationCount],
              ['Followers', profile.followerCount],
              ['Following', profile.followingCount],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <div className="eyebrow" style={{ fontSize: 9.5 }}>{k}</div>
                <div className="serif" style={{ fontSize: 28, marginTop: 4, letterSpacing: '-0.02em' }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
          {isMe ? (
            <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
              <Link href={`/u/${profile.handle}/edit`} className="btn btn--ghost btn--sm">
                Edit profile
              </Link>
              <SignOutButton />
            </div>
          ) : (
            <div style={{ marginTop: 22 }}>
              <FollowButton
                targetHandle={profile.handle}
                initialFollowing={amFollowing}
                canFollow={Boolean(me)}
              />
            </div>
          )}
        </div>
      </section>

      <div style={{ height: 1, background: 'var(--rule-strong)', margin: '0 40px' }} />

      <section style={{ padding: '48px 40px' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Recent annotations · {userAnns.length}
        </div>
        {userAnns.length === 0 ? (
          <EmptyState isMe={isMe} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 18,
            }}
          >
            {userAnns.map((a) => (
              <AnnotationCard key={a.slug} annotation={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ isMe }: { isMe: boolean }) {
  return (
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
        {isMe ? 'No annotations yet.' : 'This user hasn’t published anything yet.'}
      </div>
      {isMe && (
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.6 }}>
          Open the Annotate sidebar on any article, highlight a passage, and publish.
        </p>
      )}
      <div style={{ marginTop: 18 }}>
        <Link href="/feed" className="btn btn--ghost btn--sm">
          Browse the feed
        </Link>
      </div>
    </div>
  );
}
