import { Play } from './Icons';
import { Waveform } from './Waveform';

export type ClipPlayerProps = {
  type: 'video' | 'audio' | 'text';
  start?: string;
  end?: string;
  duration?: string;
  sourceTitle?: string;
  text?: string;
  pullQuote?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
};

export function ClipPlayer(props: ClipPlayerProps) {
  if (props.type === 'text') {
    return (
      <div
        style={{
          padding: '32px 40px',
          background: 'var(--paper-2)',
          border: '1px solid var(--rule)',
          borderLeft: '4px solid var(--theme)',
          borderRadius: 12,
        }}
      >
        <div className="eyebrow">Highlighted passage</div>
        <div
          className="serif"
          style={{
            marginTop: 16,
            fontSize: 24,
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            color: 'var(--ink)',
          }}
        >
          {props.text}
        </div>
      </div>
    );
  }

  if (props.type === 'audio') {
    if (props.mediaUrl) {
      return (
        <div
          style={{ padding: 24, background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 12 }}
        >
          <audio src={props.mediaUrl} controls style={{ width: '100%' }} />
          <div
            className="mono"
            style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', justifyContent: 'space-between' }}
          >
            <span>{props.start} → {props.end}</span>
            <span>{props.duration} · 128 kbps</span>
          </div>
        </div>
      );
    }
    return (
      <div style={{ padding: 32, background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <button
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: 'var(--theme)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
              border: 0,
              cursor: 'pointer',
            }}
            aria-label="Play"
          >
            <Play size={20} />
          </button>
          <div style={{ flex: 1, color: 'var(--theme)' }}>
            <Waveform bars={84} height={60} active={0.18} end={0.62} color="var(--theme)" dim="var(--rule-2)" />
          </div>
        </div>
      </div>
    );
  }

  // video
  if (props.mediaUrl) {
    return (
      <div
        style={{
          background: '#0e0c08',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <video
          src={props.mediaUrl}
          poster={props.thumbnailUrl}
          controls
          preload="metadata"
          style={{ display: 'block', width: '100%', aspectRatio: '16/9', background: '#0e0c08' }}
        />
      </div>
    );
  }

  // No mediaUrl yet — still processing
  return (
    <div
      style={{
        background: '#0e0c08',
        borderRadius: 12,
        aspectRatio: '16/9',
        position: 'relative',
        color: '#f4f1e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 60% 55%, rgba(120,80,60,.5) 0%, rgba(20,18,14,1) 60%)',
        }}
      />
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#cbb38a',
          }}
        >
          processing
        </div>
        <div className="serif-i" style={{ fontSize: 24, marginTop: 8, color: '#f4f1e8' }}>
          Clipping the video and indexing it…
        </div>
      </div>
    </div>
  );
}
