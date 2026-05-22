import { Type, type Schema } from '@google/genai';
import type { Enrichment, EnrichmentSource } from '@annotate/shared';
import { ENRICHMENT_SYSTEM_PROMPT, buildEnrichmentUserPrompt } from '@annotate/shared';
import { generateJSON } from '../vertex';
import { annotations } from '../mongo';

const ENRICHMENT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING },
          snippet: { type: Type.STRING },
          relationship: { type: Type.STRING, enum: ['supports', 'contradicts', 'context'] },
        },
        required: ['title', 'url', 'snippet', 'relationship'],
      },
    },
    summary: { type: Type.STRING },
  },
  required: ['sources', 'summary'],
};

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function runEnrichmentAgent(input: { slug: string }): Promise<Enrichment> {
  const col = await annotations();
  const ann = await col.findOne({ slug: input.slug });
  if (!ann) throw new Error(`annotation ${input.slug} not found`);

  const clipSummary =
    ann.type === 'text'
      ? `Selected passage: ${ann.textContent?.selectedText ?? ''}\n\nUser commentary: ${ann.commentary.text}`
      : `User commentary: ${ann.commentary.text}`;

  const claims: string[] = []; // future: derive from draft agent's keyClaims

  const raw = await generateJSON<{ sources: EnrichmentSource[]; summary: string }>({
    system: ENRICHMENT_SYSTEM_PROMPT,
    user: buildEnrichmentUserPrompt(clipSummary, claims),
    schema: ENRICHMENT_SCHEMA,
  });

  const sources = (raw.sources ?? [])
    .filter((s) => s && isHttpUrl(s.url) && s.title?.trim())
    .map((s) => ({
      title: s.title.trim().slice(0, 200),
      url: s.url.trim(),
      snippet: (s.snippet ?? '').trim().slice(0, 400),
      relationship: s.relationship,
    }))
    .slice(0, 6);

  const enrichment: Enrichment = {
    sources,
    summary: (raw.summary ?? '').trim().slice(0, 400),
    generatedAt: new Date(),
  };

  await col.updateOne(
    { slug: input.slug },
    { $set: { enrichment, updatedAt: new Date() } },
  );

  return enrichment;
}
