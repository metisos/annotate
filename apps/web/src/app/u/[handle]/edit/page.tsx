import { notFound, redirect } from 'next/navigation';
import { users } from '@/lib/mongo';
import { getSessionUser } from '@/lib/auth';
import { SiteHeader } from '@/components/SiteHeader';
import { ProfileEditForm } from './ProfileEditForm';
import type { AvatarTone } from '@/components/Avatar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit profile — Annotate' };

const TONES: AvatarTone[] = ['orange', 'blue', 'green', 'purple', 'ink', 'slate', 'cyan', 'red'];
function toneFor(seed: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const me = await getSessionUser();
  if (!me) redirect(`/sign-in?next=/u/${handle}/edit`);

  const usersCol = await users();
  const profile = await usersCol.findOne({ handle: handle.toLowerCase() });
  if (!profile) notFound();

  if (me.firebaseUid !== profile.firebaseUid) {
    redirect(`/u/${profile.handle}`);
  }

  return (
    <div className="ann" style={{ minHeight: '100dvh' }}>
      <SiteHeader user={{ name: me.displayName, handle: me.handle, tone: toneFor(me.handle), avatarUrl: me.avatarUrl }} />

      <section style={{ padding: '24px 40px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="kicker">§ edit profile</span>
        <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          /U/{profile.handle.toUpperCase()}/EDIT
        </span>
      </section>

      <section style={{ padding: '32px 40px 64px', maxWidth: 720, margin: '0 auto' }}>
        <h1
          className="serif"
          style={{ fontSize: 48, lineHeight: 1, letterSpacing: '-0.035em', fontWeight: 500 }}
        >
          Edit your profile.
        </h1>
        <p className="serif-i" style={{ fontSize: 18, lineHeight: 1.45, color: 'var(--ink-2)', marginTop: 14 }}>
          The handle change is soft — old `/u/{profile.handle}` links keep redirecting for 12 months.
        </p>

        <ProfileEditForm
          initial={{
            handle: profile.handle,
            displayName: profile.displayName,
            bio: profile.bio ?? '',
            link: profile.link ?? '',
            avatarUrl: profile.avatarUrl ?? '',
          }}
        />
      </section>
    </div>
  );
}
