'use client';

import { useEffect, useState } from 'react';
import type { Comment } from '@annotate/shared';
import { Avatar, type AvatarTone } from './Avatar';

const TONES: AvatarTone[] = ['orange', 'blue', 'green', 'purple', 'ink', 'slate', 'cyan', 'red'];
function toneFor(seed: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}

interface AuthorMap {
  [userId: string]: { handle: string; displayName: string; avatarUrl?: string };
}

export function Comments({
  slug,
  annotationId,
  viewerId,
  initialComments,
  initialAuthors,
  canPost,
}: {
  slug: string;
  annotationId: string;
  viewerId: string | null;
  initialComments: Comment[];
  initialAuthors: AuthorMap;
  canPost: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [authors, setAuthors] = useState<AuthorMap>(initialAuthors);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh comments periodically (cheap polling — Phase 7 doesn't have realtime)
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/comments?annotationId=${annotationId}`);
        if (!res.ok) return;
        const { comments: fresh } = (await res.json()) as { comments: Comment[] };
        if (cancelled) return;
        setComments(fresh);
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [annotationId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, text }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { comment } = (await res.json()) as { comment: Comment };
      setComments((cs) => [comment, ...cs]);
      // Backfill author map for the new comment from the current viewer
      if (viewerId) {
        setAuthors((a) => ({
          ...a,
          [viewerId]: a[viewerId] ?? { handle: 'you', displayName: 'You' },
        }));
      }
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this comment?')) return;
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setComments((cs) => cs.filter((c) => c._id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="eyebrow">Comments · {comments.length}</div>
      </div>

      {canPost ? (
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Add to the conversation."
            style={{
              width: '100%',
              padding: 12,
              fontFamily: 'var(--f-ui)',
              fontSize: 14,
              lineHeight: 1.5,
              background: 'var(--paper-2)',
              border: '1px solid var(--rule-2)',
              borderRadius: 8,
              color: 'var(--ink)',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {error ? (
              <div className="mono" style={{ fontSize: 11, color: '#c8321c' }}>{error}</div>
            ) : (
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                Text only · 2000 char max.
              </div>
            )}
            <button className="btn btn--accent btn--sm" type="submit" disabled={busy || !text.trim()}>
              {busy ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: 'var(--paper-3)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
          <a href="/sign-in" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Sign in
          </a>{' '}
          to comment.
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        {comments.length === 0 ? (
          <div
            style={{
              padding: '24px 20px',
              background: 'var(--paper-2)',
              border: '1px dashed var(--rule-2)',
              borderRadius: 10,
              textAlign: 'center',
              color: 'var(--ink-3)',
            }}
          >
            <div className="serif-i" style={{ fontSize: 16, color: 'var(--ink-2)' }}>
              No comments yet.
            </div>
          </div>
        ) : (
          comments.map((c) => {
            const author = authors[c.userId] ?? { handle: 'unknown', displayName: 'Unknown' };
            const tone = toneFor(author.handle);
            const isMine = viewerId === c.userId;
            return (
              <div
                key={c._id}
                style={{
                  padding: '16px 0',
                  display: 'flex',
                  gap: 14,
                  borderTop: '1px solid var(--rule)',
                }}
              >
                <Avatar name={author.displayName} tone={tone} size={32} src={author.avatarUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{author.displayName}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      @{author.handle} · {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {c.text}
                  </div>
                  {isMine && (
                    <button
                      onClick={() => remove(c._id!)}
                      className="mono"
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: 'var(--ink-3)',
                        background: 'none',
                        border: 0,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function timeAgo(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
