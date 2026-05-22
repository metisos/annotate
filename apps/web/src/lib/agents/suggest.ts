import { Type, type Schema } from '@google/genai';
import { generateJSONWithVideo } from '../vertex';

export interface SuggestedMoment {
  startTime: number; // seconds
  endTime: number;
  label: string;     // 1-line description
}

const SUGGEST_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    moments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startTime: { type: Type.INTEGER },
          endTime: { type: Type.INTEGER },
          label: { type: Type.STRING },
        },
        required: ['startTime', 'endTime', 'label'],
      },
    },
  },
  required: ['moments'],
};

const SYSTEM = `You are Annotate's clip suggestion agent. Watch the YouTube video and surface 3-5 moments worth annotating — strong quotes, decisive statements, key data points, surprising admissions. Each moment must be 15-90 seconds long. Output as integer seconds from the start of the video.`;

export async function suggestMoments(input: { youtubeUrl: string }): Promise<SuggestedMoment[]> {
  const raw = await generateJSONWithVideo<{ moments: SuggestedMoment[] }>({
    system: SYSTEM,
    user: `Find 3-5 of the most notable moments worth annotating. Each must be 15-90 seconds long. Use integer seconds from the start. Order by most interesting first. Provide a one-line label that quotes or describes what's said.`,
    videoUrl: input.youtubeUrl,
    schema: SUGGEST_SCHEMA,
  });

  return (raw.moments ?? [])
    .filter((m: SuggestedMoment) => Number.isFinite(m.startTime) && Number.isFinite(m.endTime) && m.endTime > m.startTime)
    .map((m: SuggestedMoment): SuggestedMoment => ({
      startTime: Math.max(0, Math.floor(m.startTime)),
      endTime: Math.min(m.startTime + 90, Math.floor(m.endTime)),
      label: (m.label ?? '').trim().slice(0, 200),
    }))
    .filter((m: SuggestedMoment) => m.endTime - m.startTime >= 5)
    .slice(0, 6);
}
