import type { ThemeName } from '../themes/library';

export type PageComponent =
  | 'hero'
  | 'clipPlayer'
  | 'pullQuote'
  | 'commentary'
  | 'contextCards'
  | 'sourceCard'
  | 'comments';

export type Emphasis = 'high' | 'medium' | 'low';

export interface LayoutEntry {
  component: PageComponent;
  emphasis: Emphasis;
}

export interface PageDesign {
  theme: ThemeName;
  accentColor: string;
  pageTitle: string;
  pullQuote: string | null;
  layoutPriority: LayoutEntry[];
  ogDescription: string;
  suggestedTags: string[];
  generatedAt: Date | string;
  userOverridden: boolean;
}
