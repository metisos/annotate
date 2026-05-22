'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function FollowButton({
  targetHandle,
  initialFollowing,
  canFollow,
}: {
  targetHandle: string;
  initialFollowing: boolean;
  canFollow: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [optimisticDelta, setOptimisticDelta] = useState(0);

  // Re-fetch state on mount to ensure freshness
  useEffect(() => {
    if (!canFollow) return;
    fetch(`/api/follow/${targetHandle}`)
      .then((r) => r.json())
      .then((j: { following?: boolean }) => {
        if (typeof j.following === 'boolean') setFollowing(j.following);
      })
      .catch(() => {});
  }, [targetHandle, canFollow]);

  async function toggle() {
    if (!canFollow) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    setOptimisticDelta(next ? 1 : -1);
    try {
      const res = await fetch(`/api/follow/${targetHandle}`, {
        method: next ? 'POST' : 'DELETE',
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch {
      setFollowing(!next);
      setOptimisticDelta(0);
    } finally {
      setBusy(false);
    }
  }

  if (!canFollow) {
    return (
      <a className="btn btn--accent btn--sm" href="/sign-in" style={{ textDecoration: 'none' }}>
        Sign in to follow
      </a>
    );
  }

  return (
    <button
      className={following ? 'btn btn--ghost btn--sm' : 'btn btn--accent btn--sm'}
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      data-optimistic-delta={optimisticDelta}
    >
      {busy ? '…' : following ? 'Following' : '+ Follow'}
    </button>
  );
}
