import { useEffect, useState } from 'react';
import { signIn, signOut, getStoredUser, type StoredUser } from '../lib/auth';
import {
  captureFromActiveTab,
  type CaptureResult,
  type TextCapture,
  type VideoCapture,
} from '../lib/capture';
import {
  publishTextAnnotation,
  publishMediaAnnotation,
  getAnnotationStatus,
  getDraftPreview,
  suggestMoments,
  AuthExpiredError,
} from '../lib/api';
import { WEB_BASE_URL } from '../lib/config';

type View =
  | { name: 'browse' }
  | { name: 'capture-text'; cap: TextCapture }
  | { name: 'capture-video'; cap: VideoCapture }
  | { name: 'publishing'; kind: 'text' | 'video' }
  | { name: 'processing'; slug: string }
  | { name: 'done'; slug: string };

export function App() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [view, setView] = useState<View>({ name: 'browse' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  useEffect(() => {
    if (view.name !== 'processing') return;
    const slug = view.slug;
    let cancelled = false;
    const tick = async () => {
      try {
        const status = await getAnnotationStatus(slug);
        if (cancelled) return;
        if (status.status === 'ready') setView({ name: 'done', slug });
        else if (status.status === 'failed') {
          setError('The clip pipeline failed. Try a shorter range or a different video.');
          setView({ name: 'browse' });
        }
      } catch {
        /* keep polling */
      }
    };
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [view]);

  async function onSignIn() {
    setError(null);
    setBusy(true);
    try {
      const result = await signIn();
      setUser(result.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    await signOut();
    setUser(null);
    setView({ name: 'browse' });
  }

  async function onCapture() {
    setError(null);
    setBusy(true);
    try {
      const cap: CaptureResult | null = await captureFromActiveTab();
      if (!cap) {
        setError('Open a YouTube video or highlight some text on the page, then click Clip.');
      } else if (cap.kind === 'text') {
        setView({ name: 'capture-text', cap });
      } else {
        setView({ name: 'capture-video', cap });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not capture');
    } finally {
      setBusy(false);
    }
  }

  async function onPublishText(args: { commentary: string; aiGenerated: boolean }) {
    if (view.name !== 'capture-text') return;
    const cap = view.cap;
    setError(null);
    setView({ name: 'publishing', kind: 'text' });
    try {
      const { slug, status } = await publishTextAnnotation({
        source: { url: cap.url, title: cap.title, ogImage: cap.ogImage, author: cap.author },
        textContent: { selectedText: cap.selectedText, context: cap.context },
        commentary: { text: args.commentary, aiGenerated: args.aiGenerated },
      });
      if (status === 'processing') setView({ name: 'processing', slug });
      else setView({ name: 'done', slug });
    } catch (e) {
      handlePublishError(e, { name: 'capture-text', cap });
    }
  }

  async function onPublishVideo(args: { startTime: number; endTime: number; commentary: string; audioOnly: boolean }) {
    if (view.name !== 'capture-video') return;
    const cap = view.cap;
    setError(null);
    setView({ name: 'publishing', kind: 'video' });
    try {
      const { slug } = await publishMediaAnnotation({
        type: args.audioOnly ? 'audio' : 'video',
        source: { url: cap.url, title: cap.title, ogImage: cap.ogImage },
        clip: { startTime: args.startTime, endTime: args.endTime },
        commentary: { text: args.commentary },
      });
      setView({ name: 'processing', slug });
    } catch (e) {
      handlePublishError(e, { name: 'capture-video', cap });
    }
  }

  async function handlePublishError(e: unknown, fallback: View) {
    if (e instanceof AuthExpiredError) {
      await signOut();
      setUser(null);
      setError('Your session expired. Please sign in again.');
    } else {
      setError(e instanceof Error ? e.message : 'Publish failed');
    }
    setView(fallback);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--paper)' }}>
      <Header user={user} />
      {!user ? (
        <SignedOut onSignIn={onSignIn} busy={busy} error={error} />
      ) : view.name === 'browse' ? (
        <BrowseView user={user} onCapture={onCapture} onSignOut={onSignOut} busy={busy} error={error} />
      ) : view.name === 'capture-text' ? (
        <CaptureTextView cap={view.cap} onCancel={() => setView({ name: 'browse' })} onPublish={onPublishText} />
      ) : view.name === 'capture-video' ? (
        <CaptureVideoView cap={view.cap} onCancel={() => setView({ name: 'browse' })} onPublish={onPublishVideo} />
      ) : view.name === 'publishing' ? (
        <PublishingView kind={view.kind} />
      ) : view.name === 'processing' ? (
        <ProcessingView />
      ) : (
        <DoneView slug={view.slug} onAnother={() => setView({ name: 'browse' })} />
      )}
    </div>
  );
}

function Header({ user }: { user: StoredUser | null }) {
  return (
    <header style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)', flex: '0 0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span className="serif" style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.025em' }}>Annotate</span>
        <span className="serif-i" style={{ color: 'var(--accent)', fontSize: 18 }}>.</span>
      </div>
      {user && <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>@{user.handle}</span>}
    </header>
  );
}

function SignedOut({ onSignIn, busy, error }: { onSignIn: () => void; busy: boolean; error: string | null }) {
  return (
    <div style={{ flex: 1, padding: '40px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
      <div className="eyebrow">§ welcome</div>
      <h1 className="serif" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.035em', fontWeight: 500 }}>
        Clip, annotate, publish — <span className="serif-i" style={{ color: 'var(--accent)' }}>in under thirty seconds.</span>
      </h1>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>Sign in with Google to begin.</p>
      <button className="btn btn--accent" onClick={onSignIn} disabled={busy} style={{ height: 44 }}>
        {busy ? 'Signing in…' : 'Continue with Google'}
      </button>
      {error && <div className="mono" style={{ fontSize: 11, color: '#c8321c' }}>{error}</div>}
    </div>
  );
}

function BrowseView({ user, onCapture, onSignOut, busy, error }: { user: StoredUser; onCapture: () => void; onSignOut: () => void; busy: boolean; error: string | null }) {
  return (
    <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto' }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Signed in</div>
        <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>@{user.handle}</div>
      </div>
      <button className="btn btn--accent" onClick={onCapture} disabled={busy} style={{ height: 44 }}>
        {busy ? 'Capturing…' : 'Clip from this page'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0 }}>
        On a YouTube video: click Clip and pick a range. On any other page: highlight a passage first, then click Clip.
      </p>
      {error && (
        <div style={{ padding: 10, background: 'var(--paper-3)', border: '1px solid var(--rule-2)', borderRadius: 8, fontSize: 12, color: 'var(--ink-2)' }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <a className="btn btn--ghost btn--sm" href={`${WEB_BASE_URL}/u/${user.handle}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, justifyContent: 'center' }}>My profile</a>
        <a className="btn btn--ghost btn--sm" href={`${WEB_BASE_URL}/feed`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, justifyContent: 'center' }}>Feed</a>
        <button className="btn btn--ghost btn--sm" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}

function CaptureTextView({ cap, onCancel, onPublish }: { cap: TextCapture; onCancel: () => void; onPublish: (args: { commentary: string; aiGenerated: boolean }) => void }) {
  const [commentary, setCommentary] = useState('');
  const [aiOn, setAiOn] = useState(true);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (!aiOn || draftText !== null) return;
    let cancelled = false;
    setDrafting(true);
    setDraftError(null);
    getDraftPreview({
      source: { url: cap.url, title: cap.title },
      selectedText: cap.selectedText,
    })
      .then((d) => {
        if (cancelled) return;
        setDraftText(d.draftText);
        if (!commentary) setCommentary(d.draftText);
      })
      .catch((e) => {
        if (cancelled) return;
        setDraftError(e instanceof Error ? e.message : 'AI draft failed');
      })
      .finally(() => {
        if (!cancelled) setDrafting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aiOn]);

  const aiGenerated = draftText !== null && commentary.trim() === draftText.trim();

  return (
    <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
      <SourceBlock title={cap.title} subtitle={safeHostname(cap.url)} />
      <div>
        <div className="eyebrow">Highlighted passage</div>
        <blockquote className="serif" style={{ margin: 0, marginTop: 6, padding: '10px 14px', background: 'var(--paper-2)', border: '1px solid var(--rule)', borderLeft: '3px solid var(--accent)', borderRadius: 8, fontSize: 14, lineHeight: 1.5, color: 'var(--ink)', maxHeight: 180, overflow: 'auto' }}>
          {cap.selectedText}
        </blockquote>
      </div>
      <AIAssistToggle on={aiOn} onChange={setAiOn} drafting={drafting} error={draftError} />
      <CommentaryField
        value={commentary}
        onChange={setCommentary}
        placeholder={drafting ? 'AI is drafting your annotation…' : aiOn && draftText ? 'Edit the AI draft or rewrite from scratch.' : 'Write your annotation.'}
        accent={aiGenerated}
      />
      <FooterActions
        onCancel={onCancel}
        onPublish={() => onPublish({ commentary, aiGenerated })}
        canPublish={commentary.trim().length > 0 && !drafting}
        publishLabel={aiGenerated ? 'Publish AI draft' : 'Publish'}
      />
    </div>
  );
}

function CaptureVideoView({ cap, onCancel, onPublish }: { cap: VideoCapture; onCancel: () => void; onPublish: (args: { startTime: number; endTime: number; commentary: string; audioOnly: boolean }) => void }) {
  const [start, setStart] = useState(cap.currentTime);
  const [end, setEnd] = useState(Math.min(cap.currentTime + 30, cap.duration || cap.currentTime + 30));
  const [commentary, setCommentary] = useState('');
  const [audioOnly, setAudioOnly] = useState(false);
  const duration = Math.max(0, end - start);
  const valid = duration > 0 && duration <= 90 && commentary.trim().length > 0;

  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ startTime: number; endTime: number; label: string }> | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  async function onSuggest() {
    setSuggesting(true);
    setSuggestError(null);
    try {
      const m = await suggestMoments(cap.url);
      setSuggestions(m);
      setSelectedIdx(null);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : 'Suggest failed');
    } finally {
      setSuggesting(false);
    }
  }

  function adoptSuggestion(m: { startTime: number; endTime: number; label: string }, i: number) {
    setStart(m.startTime);
    setEnd(m.endTime);
    setSelectedIdx(i);
  }

  function onStartChange(v: number) {
    setStart(v);
    if (selectedIdx !== null && suggestions?.[selectedIdx]?.startTime !== v) setSelectedIdx(null);
  }
  function onEndChange(v: number) {
    setEnd(v);
    if (selectedIdx !== null && suggestions?.[selectedIdx]?.endTime !== v) setSelectedIdx(null);
  }

  return (
    <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
      <SourceBlock title={cap.title} subtitle={`youtube.com · ${cap.channelName ?? 'video'}`} />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="eyebrow">Clip range</div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{duration}s · 90s max</span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <TimeInput label="Start" value={start} max={Math.max(0, end - 1)} onChange={onStartChange} />
          <TimeInput label="End" value={end} max={Math.max(end, cap.duration || 9999)} onChange={onEndChange} />
        </div>
        {duration > 90 && (
          <div className="mono" style={{ fontSize: 11, color: '#c8321c', marginTop: 8 }}>
            Clip exceeds the 90-second max.
          </div>
        )}
      </div>

      <SuggestSection
        suggesting={suggesting}
        suggestions={suggestions}
        error={suggestError}
        onSuggest={onSuggest}
        onAdopt={adoptSuggestion}
        selectedIdx={selectedIdx}
      />

      <AudioOnlyToggle on={audioOnly} onChange={setAudioOnly} />

      <CommentaryField
        value={commentary}
        onChange={setCommentary}
        placeholder="Required: write your take so others know why this moment matters."
      />

      {!valid && (
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
            padding: '4px 2px',
          }}
        >
          {duration === 0
            ? 'Pick a clip range first (or tap a suggested moment above).'
            : duration > 90
              ? 'Clip is longer than 90 seconds — shorten the range.'
              : 'Type your take to enable Publish.'}
        </div>
      )}

      <FooterActions
        onCancel={onCancel}
        onPublish={() => onPublish({ startTime: start, endTime: end, commentary, audioOnly })}
        canPublish={valid}
        publishLabel={`Clip ${duration}s${audioOnly ? ' · audio' : ''}`}
      />
    </div>
  );
}

function AudioOnlyToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--paper-3)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>Audio only</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          Extract the audio track instead of clipping the video.
        </div>
      </div>
      <button
        onClick={() => onChange(!on)}
        aria-pressed={on}
        style={{
          width: 32,
          height: 18,
          borderRadius: 12,
          background: on ? 'var(--accent)' : 'var(--rule-2)',
          position: 'relative',
          border: 0,
          cursor: 'pointer',
          flex: '0 0 auto',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: 10,
            background: '#fff',
            transition: 'left 120ms ease',
          }}
        />
      </button>
    </div>
  );
}

function SuggestSection({
  suggesting,
  suggestions,
  error,
  onSuggest,
  onAdopt,
  selectedIdx,
}: {
  suggesting: boolean;
  suggestions: Array<{ startTime: number; endTime: number; label: string }> | null;
  error: string | null;
  onSuggest: () => void;
  onAdopt: (m: { startTime: number; endTime: number; label: string }, i: number) => void;
  selectedIdx: number | null;
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--paper-3)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--accent)' }}>⊹</span>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>Suggest moments</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              Annotate Agent watches the video and finds clips worth annotating.
            </div>
          </div>
        </div>
        <button
          className="btn btn--ghost btn--sm"
          onClick={onSuggest}
          disabled={suggesting}
          style={{ flex: '0 0 auto' }}
        >
          {suggesting ? 'Watching…' : suggestions ? 'Refresh' : 'Suggest'}
        </button>
      </div>

      {error && (
        <div className="mono" style={{ fontSize: 11, color: '#c8321c' }}>
          {error}
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {suggestions.map((m, i) => {
            const isSelected = selectedIdx === i;
            return (
              <button
                key={i}
                onClick={() => onAdopt(m, i)}
                aria-pressed={isSelected}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  background: isSelected ? 'var(--accent-soft, rgba(211, 74, 28, 0.10))' : 'var(--paper-2)',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--rule)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  transition: 'background 120ms ease, border-color 120ms ease',
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    color: isSelected ? 'var(--accent)' : 'var(--ink-3)',
                    flex: '0 0 auto',
                    width: 60,
                  }}
                >
                  {fmtMS(m.startTime)} → {fmtMS(m.endTime)}
                </span>
                <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.4, color: 'var(--ink)' }}>
                  {m.label}
                </span>
                {isSelected ? (
                  <span
                    className="mono"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      flex: '0 0 auto',
                      padding: '2px 6px',
                      border: '1px solid var(--accent)',
                      borderRadius: 4,
                    }}
                  >
                    Selected
                  </span>
                ) : (
                  <span
                    className="mono"
                    style={{ fontSize: 10.5, color: 'var(--ink-3)', flex: '0 0 auto' }}
                  >
                    {m.endTime - m.startTime}s
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmtMS(s: number): string {
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function AIAssistToggle({
  on,
  onChange,
  drafting,
  error,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  drafting: boolean;
  error: string | null;
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--paper-3)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--accent)' }}>⊹</span>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>AI Assist</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {drafting ? 'Drafting your annotation…' : error ? error : 'Annotate Agent drafts your take — edit before publishing.'}
          </div>
        </div>
      </div>
      <button
        onClick={() => onChange(!on)}
        aria-pressed={on}
        style={{
          width: 32,
          height: 18,
          borderRadius: 12,
          background: on ? 'var(--accent)' : 'var(--rule-2)',
          position: 'relative',
          border: 0,
          cursor: 'pointer',
          flex: '0 0 auto',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: 10,
            background: '#fff',
            transition: 'left 120ms ease',
          }}
        />
      </button>
    </div>
  );
}

function SourceBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div className="eyebrow">Source</div>
      <div className="serif" style={{ fontSize: 16, marginTop: 6, lineHeight: 1.25, letterSpacing: '-0.015em' }}>{title}</div>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}

function CommentaryField({
  value,
  onChange,
  placeholder,
  accent,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="eyebrow">Your take</div>
        {accent && (
          <span
            className="mono"
            style={{
              fontSize: 9.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--accent-deep)',
              background: 'var(--accent-tint)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            ⊹ AI draft
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder={placeholder ?? 'Write your annotation.'}
        style={{
          marginTop: 6,
          width: '100%',
          padding: 12,
          fontFamily: 'var(--f-display)',
          fontSize: 14,
          lineHeight: 1.55,
          background: accent ? 'var(--accent-tint)' : 'var(--paper-2)',
          border: accent ? '1px solid var(--accent-soft)' : '1px solid var(--rule-2)',
          borderRadius: 8,
          color: 'var(--ink)',
          resize: 'vertical',
          outline: 'none',
        }}
      />
    </div>
  );
}

function FooterActions({ onCancel, onPublish, canPublish, publishLabel = 'Publish' }: { onCancel: () => void; onPublish: () => void; canPublish: boolean; publishLabel?: string }) {
  return (
    <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
      <button className="btn btn--ghost" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
      <button className="btn btn--accent" onClick={onPublish} disabled={!canPublish} style={{ flex: 1.4, justifyContent: 'center' }}>
        {publishLabel}
      </button>
    </div>
  );
}

function TimeInput({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--rule-2)', borderRadius: 6, display: 'block' }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value))))}
          style={{ width: '100%', font: 'inherit', fontFamily: 'var(--f-mono)', fontSize: 16, fontWeight: 500, border: 0, outline: 0, background: 'transparent', color: 'var(--ink)' }}
        />
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>s</span>
      </div>
    </label>
  );
}

function PublishingView({ kind }: { kind: 'text' | 'video' }) {
  return (
    <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div className="serif-i" style={{ fontSize: 22, color: 'var(--ink-2)' }}>
        {kind === 'video' ? 'Submitting…' : 'Publishing…'}
      </div>
    </div>
  );
}

function ProcessingView() {
  return (
    <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <div className="eyebrow">Processing</div>
      <div className="serif-i" style={{ fontSize: 22, color: 'var(--ink-2)' }}>
        Clipping the video at 240p…
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
        Usually ~30 seconds. Stay in this panel.
      </div>
    </div>
  );
}

function DoneView({ slug, onAnother }: { slug: string; onAnother: () => void }) {
  const url = `${WEB_BASE_URL}/clip/${slug}`;
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="eyebrow">Published</div>
        <h2 className="serif" style={{ fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.025em', marginTop: 6 }}>
          Your annotation is live.
        </h2>
      </div>
      <div style={{ padding: 10, background: 'var(--paper-3)', border: '1px solid var(--rule-2)', borderRadius: 8, fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-2)', wordBreak: 'break-all' }}>
        {url}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a className="btn btn--accent" href={url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, justifyContent: 'center' }}>Open</a>
        <button
          className="btn btn--ghost"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <button className="btn btn--ghost btn--sm" onClick={onAnother} style={{ marginTop: 'auto', justifyContent: 'center' }}>
        Clip another
      </button>
    </div>
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
