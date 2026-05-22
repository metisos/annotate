import { annotations } from '../mongo';
import { clipVideo } from './clip-video';
import { indexClipOnTwelveLabs } from './index-twelvelabs';
import { runPageDesignAgent } from '../agents/page-design';
import { runEnrichmentAgent } from '../agents/enrich';
import { embedAndStoreAnnotation } from './embed-annotation';

/**
 * Orchestrates the full video annotation pipeline:
 *   1. E2B sandbox runs yt-dlp + ffmpeg → 240p MP4 + thumbnail
 *   2. Upload both to Firebase Storage (public read)
 *   3. Kick off Twelve Labs indexing (non-blocking on the TL side)
 *   4. Flip annotation status to 'ready'
 *   5. Trigger the page-design agent
 *
 * On any failure, the annotation is marked status='failed' with an error note.
 */
export async function processVideoAnnotation(input: {
  slug: string;
  userId: string;
  sourceUrl: string;
  startTime: number;
  endTime: number;
}): Promise<void> {
  const col = await annotations();
  const ann = await col.findOne({ slug: input.slug });
  if (!ann) {
    console.error(`[pipeline] annotation ${input.slug} not found`);
    return;
  }

  try {
    const clip = await clipVideo({
      sourceUrl: input.sourceUrl,
      startTime: input.startTime,
      endTime: input.endTime,
      userId: input.userId,
      annotationId: String(ann._id),
    });

    let twelveLabsVideoId: string | undefined;
    let twelveLabsIndexId: string | undefined;
    try {
      const tl = await indexClipOnTwelveLabs({ mediaUrl: clip.mediaUrl });
      twelveLabsIndexId = tl.indexId;
      twelveLabsVideoId = tl.videoId ?? tl.taskId; // we store taskId until videoId resolves
      console.log(`[pipeline] Twelve Labs task ${tl.taskId} created for ${input.slug}`);
    } catch (e) {
      console.warn(
        `[pipeline] Twelve Labs indexing failed for ${input.slug}: ${
          e instanceof Error ? e.message : e
        } — continuing anyway`,
      );
    }

    await col.updateOne(
      { slug: input.slug },
      {
        $set: {
          status: 'ready',
          clip: {
            startTime: input.startTime,
            endTime: input.endTime,
            duration: clip.duration,
            mediaUrl: clip.mediaUrl,
            thumbnailUrl: clip.thumbnailUrl,
            resolution: '360p' as const,
            ...(twelveLabsVideoId ? { twelveLabsVideoId } : {}),
            ...(twelveLabsIndexId ? { twelveLabsIndexId } : {}),
          },
          updatedAt: new Date(),
        },
      },
    );

    // Page-design first → USC embed; enrichment in parallel
    void runPageDesignAgent(input.slug)
      .then(() => embedAndStoreAnnotation(input.slug))
      .catch((e) => {
        console.error(`[pipeline] page-design+embed for ${input.slug}:`, e);
      });
    void runEnrichmentAgent({ slug: input.slug }).catch((e) => {
      console.error(`[pipeline] enrichment failed for ${input.slug}:`, e);
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[pipeline] failed for ${input.slug}:`, message);
    await col.updateOne(
      { slug: input.slug },
      { $set: { status: 'failed', updatedAt: new Date() } },
    );
  }
}
