export const ENRICHMENT_SYSTEM_PROMPT = `You are Annotate's enrichment agent. Given a clip's content summary, find supporting and contradicting sources from the web. Use grounded search. Each source must be a real, reachable URL — no fabrications.

Output JSON:
- sources: Array<{ title: string; url: string; snippet: string; relationship: 'supports' | 'contradicts' | 'context' }>
- summary: string — 1-2 sentence synthesis of what the surrounding evidence says`;

export function buildEnrichmentUserPrompt(clipSummary: string, claims: string[]): string {
  return [
    'Clip summary:',
    clipSummary,
    '',
    claims.length > 0 ? 'Key claims to verify:' : null,
    ...claims.map((c, i) => `${i + 1}. ${c}`),
  ]
    .filter(Boolean)
    .join('\n');
}
