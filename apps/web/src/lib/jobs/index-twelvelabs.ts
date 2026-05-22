import { getTwelveLabs, getIndexId } from '../twelvelabs';

/**
 * Kicks off a Twelve Labs indexing task on the uploaded video URL. Returns
 * the task ID + video ID once the video is registered. The index task
 * continues in the background on Twelve Labs' side; we don't wait for full
 * indexing completion.
 */
export async function indexClipOnTwelveLabs(input: {
  mediaUrl: string;
}): Promise<{ taskId: string; videoId: string | null; indexId: string }> {
  const client = getTwelveLabs();
  const indexId = getIndexId();
  // twelvelabs-js v0.4 API surface
  const task = await (client as unknown as {
    task: {
      create(input: { indexId: string; url: string }): Promise<{ id: string; videoId?: string }>;
    };
  }).task.create({ indexId, url: input.mediaUrl });

  return { taskId: task.id, videoId: task.videoId ?? null, indexId };
}
