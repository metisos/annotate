import { annotations } from '../mongo';
import { clipAudio } from './clip-audio';
import { runPageDesignAgent } from '../agents/page-design';
import { runEnrichmentAgent } from '../agents/enrich';
import { embedAndStoreAnnotation } from './embed-annotation';

export async function processAudioAnnotation(input: {
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
    const clip = await clipAudio({
      sourceUrl: input.sourceUrl,
      startTime: input.startTime,
      endTime: input.endTime,
      userId: input.userId,
      annotationId: String(ann._id),
    });

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
            resolution: '240p' as const, // unused for audio but keeps schema happy
          },
          updatedAt: new Date(),
        },
      },
    );

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
    console.error(`[pipeline] audio failed for ${input.slug}:`, message);
    await col.updateOne(
      { slug: input.slug },
      { $set: { status: 'failed', updatedAt: new Date() } },
    );
  }
}
