'use client';

import { useEffect, useRef, useState } from 'react';

const OUTPUT_SIZE = 512;
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5MB before crop

export function AvatarCropper({
  currentUrl,
  onUpload,
}: {
  currentUrl?: string;
  onUpload: (blob: Blob) => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pickedBlob, setPickedBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onPick(file: File) {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Pick an image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError(`Image is over 5MB.`);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fbfaf6';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      // Center-crop to square
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError('Could not process image.');
            return;
          }
          setPickedBlob(blob);
          if (preview) URL.revokeObjectURL(preview);
          setPreview(URL.createObjectURL(blob));
        },
        'image/jpeg',
        0.9,
      );
    };
    img.onerror = () => setError('Could not read image.');
    img.src = url;
  }

  async function submit() {
    if (!pickedBlob) return;
    setBusy(true);
    setError(null);
    try {
      await onUpload(pickedBlob);
      setPickedBlob(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  const displayUrl = preview ?? currentUrl;

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <div
        style={{
          width: 128,
          height: 128,
          borderRadius: '50%',
          background: 'var(--paper-3)',
          border: '1px solid var(--rule)',
          overflow: 'hidden',
          flex: '0 0 auto',
        }}
      >
        {displayUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={displayUrl}
            alt="Avatar preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-3)',
              fontSize: 12,
            }}
          >
            no image
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPick(f);
            e.target.value = '';
          }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => fileInputRef.current?.click()}
          >
            {currentUrl || pickedBlob ? 'Change photo' : 'Pick a photo'}
          </button>
          {pickedBlob && (
            <button
              type="button"
              className="btn btn--accent btn--sm"
              onClick={submit}
              disabled={busy}
            >
              {busy ? 'Uploading…' : 'Save photo'}
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.5 }}>
          Auto-centered to a 512px square. JPG, PNG, or WebP up to 5MB.
        </div>
        {error && (
          <div className="mono" style={{ fontSize: 11, color: '#c8321c', marginTop: 8 }}>
            {error}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
