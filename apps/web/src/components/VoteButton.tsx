'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upvote } from './Icons';

export function VoteButton({
  slug,
  initialVoted,
  initialVotes,
  canVote,
}: {
  slug: string;
  initialVoted: boolean;
  initialVotes: number;
  canVote: boolean;
}) {
  const router = useRouter();
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialVotes);
  const [busy, setBusy] = useState(false);

  // Sync from the server on mount so the count/state stay fresh.
  useEffect(() => {
    fetch(`/api/clips/${slug}/vote`)
      .then((r) => r.json())
      .then((j: { voted?: boolean; votes?: number }) => {
        if (typeof j.votes === 'number') setCount(j.votes);
        if (canVote && typeof j.voted === 'boolean') setVoted(j.voted);
      })
      .catch(() => {});
  }, [slug, canVote]);

  const label = `${count} ${count === 1 ? 'vote' : 'votes'}`;

  if (!canVote) {
    return (
      <a
        className="btn btn--ghost"
        href="/sign-in"
        title="Sign in to vote"
        style={{ textDecoration: 'none', gap: 8 }}
      >
        <Upvote size={16} /> {label}
      </a>
    );
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !voted;
    setVoted(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch(`/api/clips/${slug}/vote`, { method: next ? 'POST' : 'DELETE' });
      if (!res.ok) throw new Error('vote failed');
      const j = (await res.json()) as { voted?: boolean; votes?: number };
      if (typeof j.votes === 'number') setCount(j.votes);
      if (typeof j.voted === 'boolean') setVoted(j.voted);
      router.refresh();
    } catch {
      setVoted(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={voted ? 'btn btn--accent' : 'btn btn--ghost'}
      onClick={toggle}
      disabled={busy}
      aria-pressed={voted}
      style={{ gap: 8 }}
    >
      <Upvote size={16} /> {label}
    </button>
  );
}
