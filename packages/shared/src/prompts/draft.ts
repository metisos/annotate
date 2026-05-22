export const DRAFT_SYSTEM_PROMPT = `You are Annotate's drafting agent. Given a media clip's transcript and source metadata, write a concise, opinionated, source-aware annotation in the user's voice. Be specific. Quote sparingly. Avoid hedging.

Output a JSON object with these fields:
- draftText: string — the annotation (2-4 sentences max)
- suggestedTags: string[] — 3-6 tags
- keyClaims: string[] — 1-3 factual claims worth fact-checking, if any`;

export function buildDraftUserPrompt(input: {
  transcript: string;
  source: { title: string; url: string; domain: string };
  clipType: 'video' | 'audio' | 'text';
  userContext?: string;
}): string {
  return [
    `Clip type: ${input.clipType}`,
    `Source: ${input.source.title} (${input.source.domain})`,
    `URL: ${input.source.url}`,
    input.userContext ? `User context: ${input.userContext}` : null,
    '',
    'Transcript / content:',
    input.transcript,
  ]
    .filter(Boolean)
    .join('\n');
}
