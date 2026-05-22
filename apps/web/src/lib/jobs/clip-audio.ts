import { Sandbox } from 'e2b';
import { uploadClipFile } from '../storage';

export interface ClipAudioInput {
  sourceUrl: string;
  startTime: number;
  endTime: number;
  userId: string;
  annotationId: string;
}

export interface ClipAudioOutput {
  mediaUrl: string;
  duration: number;
  bytes: number;
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export async function clipAudio(input: ClipAudioInput): Promise<ClipAudioOutput> {
  if (input.endTime - input.startTime <= 0) throw new Error('endTime must be > startTime');
  if (input.endTime - input.startTime > 90) throw new Error('clip exceeds 90s max');

  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error('E2B_API_KEY is not set');

  const start = fmtTime(input.startTime);
  const end = fmtTime(input.endTime);
  const duration = input.endTime - input.startTime;

  console.log(`[clip-audio] starting sandbox for ${input.annotationId}`);
  const sbx = await Sandbox.create({ apiKey, timeoutMs: 180_000 });

  try {
    console.log('[clip-audio] installing ffmpeg + yt-dlp');
    const install = await sbx.commands.run(
      'sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg && pip install -q yt-dlp',
      { timeoutMs: 120_000 },
    );
    if (install.exitCode !== 0) {
      throw new Error(`install failed: ${install.stderr.slice(0, 500)}`);
    }

    const dl = await sbx.commands.run(
      [
        'cd /tmp &&',
        'yt-dlp',
        `--download-sections "*${start}-${end}"`,
        `--force-keyframes-at-cuts`,
        `-f "bestaudio"`,
        `-x --audio-format mp3 --audio-quality 5`,
        `-o "raw.%(ext)s"`,
        `"${input.sourceUrl}"`,
      ].join(' '),
      { timeoutMs: 120_000 },
    );
    if (dl.exitCode !== 0) {
      throw new Error(`yt-dlp failed: ${dl.stderr.slice(0, 500)}`);
    }

    // yt-dlp's --download-sections doesn't guarantee tight trim on audio;
    // re-trim with ffmpeg from t=0 (yt-dlp already cut roughly).
    const trim = await sbx.commands.run(
      'cd /tmp && ffmpeg -y -i raw.mp3 -c:a libmp3lame -b:a 128k -ar 44100 output.mp3',
      { timeoutMs: 90_000 },
    );
    if (trim.exitCode !== 0) {
      throw new Error(`ffmpeg trim failed: ${trim.stderr.slice(0, 500)}`);
    }

    const audioBytes = (await sbx.files.read('/tmp/output.mp3', { format: 'bytes' })) as Uint8Array;
    console.log(`[clip-audio] downloaded ${audioBytes.byteLength}B audio`);

    const audio = await uploadClipFile({
      userId: input.userId,
      annotationId: input.annotationId,
      filename: 'audio.mp3',
      data: Buffer.from(audioBytes),
      contentType: 'audio/mpeg',
    });

    return {
      mediaUrl: audio.publicUrl,
      duration,
      bytes: audio.size,
    };
  } finally {
    await sbx.kill().catch(() => {});
  }
}
