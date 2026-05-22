import { Type, type Schema } from '@google/genai';
import type { Annotation, PageDesign, LayoutEntry, PageComponent, Emphasis } from '@annotate/shared';
import {
  PAGE_DESIGN_SYSTEM_PROMPT,
  THEMES,
  THEME_NAMES,
  buildPageDesignUserPrompt,
  isValidTheme,
  DEFAULT_THEME,
} from '@annotate/shared';
import { generateJSON } from '../vertex';
import { annotations } from '../mongo';

const PAGE_DESIGN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    theme: { type: Type.STRING, enum: [...THEME_NAMES] },
    pageTitle: { type: Type.STRING },
    pullQuote: { type: Type.STRING, nullable: true },
    ogDescription: { type: Type.STRING },
    suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
    layoutPriority: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          component: {
            type: Type.STRING,
            enum: ['hero', 'clipPlayer', 'pullQuote', 'commentary', 'contextCards', 'sourceCard', 'comments'],
          },
          emphasis: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
        },
        required: ['component', 'emphasis'],
      },
    },
  },
  required: ['theme', 'pageTitle', 'pullQuote', 'ogDescription', 'suggestedTags', 'layoutPriority'],
};

const VALID_COMPONENTS = new Set([
  'hero',
  'clipPlayer',
  'pullQuote',
  'commentary',
  'contextCards',
  'sourceCard',
  'comments',
]);

const VALID_EMPHASIS = new Set(['high', 'medium', 'low']);

function validate(raw: unknown): PageDesign | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<PageDesign> & Record<string, unknown>;
  if (typeof r.theme !== 'string' || !isValidTheme(r.theme)) return null;
  if (typeof r.pageTitle !== 'string' || !r.pageTitle.trim()) return null;
  if (r.pullQuote !== null && typeof r.pullQuote !== 'string') return null;
  if (typeof r.ogDescription !== 'string') return null;
  if (!Array.isArray(r.layoutPriority)) return null;

  const layout: LayoutEntry[] = [];
  for (const e of r.layoutPriority) {
    if (
      typeof e === 'object' &&
      e !== null &&
      typeof (e as { component?: unknown }).component === 'string' &&
      typeof (e as { emphasis?: unknown }).emphasis === 'string' &&
      VALID_COMPONENTS.has((e as { component: string }).component) &&
      VALID_EMPHASIS.has((e as { emphasis: string }).emphasis)
    ) {
      layout.push({
        component: (e as { component: PageComponent }).component,
        emphasis: (e as { emphasis: Emphasis }).emphasis,
      });
    }
  }
  if (layout.length === 0) return null;

  const tags = Array.isArray(r.suggestedTags)
    ? r.suggestedTags.filter((t): t is string => typeof t === 'string').slice(0, 8)
    : [];

  return {
    theme: r.theme,
    accentColor: THEMES[r.theme].accentColor,
    pageTitle: r.pageTitle.trim().slice(0, 140),
    pullQuote: r.pullQuote ? r.pullQuote.trim().slice(0, 280) : null,
    layoutPriority: layout,
    ogDescription: r.ogDescription.trim().slice(0, 200),
    suggestedTags: tags,
    generatedAt: new Date(),
    userOverridden: false,
  };
}

function defaultDesign(ann: Annotation): PageDesign {
  return {
    theme: DEFAULT_THEME,
    accentColor: THEMES[DEFAULT_THEME].accentColor,
    pageTitle: ann.source.title,
    pullQuote: null,
    layoutPriority: [
      { component: 'hero', emphasis: 'high' },
      { component: 'clipPlayer', emphasis: 'high' },
      { component: 'commentary', emphasis: 'high' },
      { component: 'sourceCard', emphasis: 'low' },
      { component: 'comments', emphasis: 'low' },
    ],
    ogDescription: ann.commentary.text.slice(0, 160),
    suggestedTags: [],
    generatedAt: new Date(),
    userOverridden: false,
  };
}

export async function runPageDesignAgent(slug: string): Promise<PageDesign> {
  const col = await annotations();
  const ann = await col.findOne({ slug });
  if (!ann) throw new Error(`annotation ${slug} not found`);

  const transcript =
    ann.type === 'text'
      ? ann.textContent?.selectedText ?? ''
      : 'Transcript not yet available (media indexing arrives in Phase 4).';

  let design: PageDesign;
  try {
    const raw = await generateJSON<unknown>({
      system: PAGE_DESIGN_SYSTEM_PROMPT,
      user: buildPageDesignUserPrompt({
        clipType: ann.type,
        transcript,
        commentary: ann.commentary.text,
        source: {
          title: ann.source.title,
          url: ann.source.url,
          domain: ann.source.domain,
        },
        hasContextCards: Boolean(ann.enrichment && ann.enrichment.sources.length > 0),
      }),
      schema: PAGE_DESIGN_SCHEMA,
    });
    const validated = validate(raw);
    if (!validated) {
      console.warn(`[page-design] invalid output for ${slug}, using default theme`);
      design = defaultDesign(ann);
    } else {
      design = validated;
    }
  } catch (e) {
    console.error(`[page-design] Vertex call failed for ${slug}:`, e instanceof Error ? e.message : e);
    design = defaultDesign(ann);
  }

  await col.updateOne(
    { slug },
    { $set: { pageDesign: design, updatedAt: new Date() } },
  );
  return design;
}
