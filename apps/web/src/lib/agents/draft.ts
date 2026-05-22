import { Type, type Schema } from '@google/genai';
import { DRAFT_SYSTEM_PROMPT, buildDraftUserPrompt } from '@annotate/shared';
import { generateJSON } from '../vertex';
import { annotations } from '../mongo';

export interface DraftResult {
  draftText: string;
  suggestedTags: string[];
  keyClaims: string[];
}

const DRAFT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    draftText: { type: Type.STRING },
    suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
    keyClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['draftText', 'suggestedTags', 'keyClaims'],
};

export async function runDraftAgent(input: {
  slug: string;
  userContext?: string;
}): Promise<DraftResult> {
  const col = await annotations();
  const ann = await col.findOne({ slug: input.slug });
  if (!ann) throw new Error(`annotation ${input.slug} not found`);

  const transcript =
    ann.type === 'text'
      ? ann.textContent?.selectedText ?? ann.commentary.text
      : ann.commentary.text || 'Transcript pending media indexing.';

  return runDraftFromInputs({
    transcript,
    source: {
      title: ann.source.title,
      url: ann.source.url,
      domain: ann.source.domain,
    },
    clipType: ann.type,
    userContext: input.userContext,
  });
}

export async function runDraftFromInputs(input: {
  transcript: string;
  source: { title: string; url: string; domain: string };
  clipType: 'video' | 'audio' | 'text';
  userContext?: string;
}): Promise<DraftResult> {
  const raw = await generateJSON<DraftResult>({
    system: DRAFT_SYSTEM_PROMPT,
    user: buildDraftUserPrompt({
      transcript: input.transcript,
      source: input.source,
      clipType: input.clipType,
      userContext: input.userContext,
    }),
    schema: DRAFT_SCHEMA,
  });
  return {
    draftText: (raw.draftText ?? '').toString().trim(),
    suggestedTags: Array.isArray(raw.suggestedTags) ? raw.suggestedTags.slice(0, 8) : [],
    keyClaims: Array.isArray(raw.keyClaims) ? raw.keyClaims.slice(0, 5) : [],
  };
}
