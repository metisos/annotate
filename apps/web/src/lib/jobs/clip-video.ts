import { Sandbox } from 'e2b';
import { uploadClipFile } from '../storage';

export interface ClipVideoInput {
  sourceUrl: string;
  startTime: number; // seconds
  endTime: number;   // seconds
  userId: string;
  annotationId: string;
}

export interface ClipVideoOutput {
  mediaUrl: string;
  thumbnailUrl: string;
  duration: number;
  resolution: '360p';
  bytes: number;
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export async function clipVideo(input: ClipVideoInput): Promise<ClipVideoOutput> {
  if (input.endTime - input.startTime <= 0) throw new Error('endTime must be > startTime');
  if (input.endTime - input.startTime > 90) throw new Error('clip exceeds 90s max');

  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error('E2B_API_KEY is not set');

  const start = fmtTime(input.startTime);
  const end = fmtTime(input.endTime);
  const duration = input.endTime - input.startTime;

  console.log(`[clip-video] starting sandbox for ${input.annotationId}`);
  const sbx = await Sandbox.create({ apiKey, timeoutMs: 180_000 });

  try {
    // Install ffmpeg + yt-dlp. Cheaper to use a custom E2B template in production,
    // but for now we install on demand to keep the build path simple.
    console.log('[clip-video] installing ffmpeg + yt-dlp');
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
        `-f "bestvideo[height<=480]+bestaudio/best[height<=480]"`,
        `--merge-output-format mp4`,
        `-o "raw.mp4"`,
        `"${input.sourceUrl}"`,
      ].join(' '),
      { timeoutMs: 120_000 },
    );
    if (dl.exitCode !== 0) {
      throw new Error(`yt-dlp failed: ${dl.stderr.slice(0, 500)}`);
    }

    const transcode = await sbx.commands.run(
      [
        'cd /tmp &&',
        'ffmpeg -y -i raw.mp4',
        '-vf "scale=-2:360"',
        '-c:v libx264 -preset fast -crf 23',
        '-c:a aac -b:a 128k',
        '-movflags +faststart',
        'output.mp4',
      ].join(' '),
      { timeoutMs: 120_000 },
    );
    if (transcode.exitCode !== 0) {
      throw new Error(`ffmpeg transcode failed: ${transcode.stderr.slice(0, 500)}`);
    }

    const thumb = await sbx.commands.run(
      'cd /tmp && ffmpeg -y -i output.mp4 -ss 1 -vframes 1 -vf "scale=-2:480" thumb.jpg',
      { timeoutMs: 30_000 },
    );
    if (thumb.exitCode !== 0) {
      throw new Error(`thumbnail failed: ${thumb.stderr.slice(0, 500)}`);
    }

    const videoBytes = (await sbx.files.read('/tmp/output.mp4', { format: 'bytes' })) as Uint8Array;
    const thumbBytes = (await sbx.files.read('/tmp/thumb.jpg', { format: 'bytes' })) as Uint8Array;

    console.log(
      `[clip-video] downloaded ${videoBytes.byteLength}B video + ${thumbBytes.byteLength}B thumb`,
    );

    const video = await uploadClipFile({
      userId: input.userId,
      annotationId: input.annotationId,
      filename: 'video.mp4',
      data: Buffer.from(videoBytes),
      contentType: 'video/mp4',
    });
    const thumbnail = await uploadClipFile({
      userId: input.userId,
      annotationId: input.annotationId,
      filename: 'thumbnail.jpg',
      data: Buffer.from(thumbBytes),
      contentType: 'image/jpeg',
    });

    return {
      mediaUrl: video.publicUrl,
      thumbnailUrl: thumbnail.publicUrl,
      duration,
      resolution: '360p',
      bytes: video.size,
    };
  } finally {
    await sbx.kill().catch(() => {});
  }
}
