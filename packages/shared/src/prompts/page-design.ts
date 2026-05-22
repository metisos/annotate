import { THEMES, type ThemeName } from '../themes/library';

export const PAGE_DESIGN_SYSTEM_PROMPT = `You are Annotate's page design agent. Given an annotation's clip transcript, commentary, source metadata, and tone, output a structured page design specification.

Constraints:
- theme MUST be one of the predefined theme names.
- pageTitle should read like a magazine headline (5-12 words). Do NOT echo the source title.
- pullQuote MUST be an exact or near-exact phrase from the clip transcript. Set null if no strong quote exists or for text-only clips.
- ogDescription must be under 160 characters.
- layoutPriority orders components by visual weight for this specific annotation.

Available components: hero, clipPlayer, pullQuote, commentary, contextCards, sourceCard, comments
Emphasis levels: high, medium, low

Output JSON matching the PageDesign schema.`;

export function buildPageDesignUserPrompt(input: {
  clipType: 'video' | 'audio' | 'text';
  transcript: string;
  commentary: string;
  source: { title: string; url: string; domain: string };
  hasContextCards: boolean;
}): string {
  const themeList = Object.entries(THEMES)
    .map(([name, t]) => `- ${name}: ${t.trigger}`)
    .join('\n');

  return [
    'Available themes:',
    themeList,
    '',
    `Clip type: ${input.clipType}`,
    `Source: ${input.source.title} (${input.source.domain})`,
    `Has AI context cards: ${input.hasContextCards}`,
    '',
    'User commentary:',
    input.commentary,
    '',
    'Clip transcript:',
    input.transcript,
  ].join('\n');
}

export function isValidTheme(name: string): name is ThemeName {
  return name in THEMES;
}
