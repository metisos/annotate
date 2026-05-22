import { annotations } from '../mongo';
import { embedText } from '../embed';

export const ANNOTATE_PUBLIC_WORKSPACE = 'annotate-public';

/**
 * Compose the canonical text we embed for an annotation: pageTitle + commentary +
 * (text-clip selected passage). This is what semantic queries match against.
 */
export function composeEmbeddableText(input: {
  pageTitle?: string;
  commentary: string;
  selectedText?: string;
}): string {
  const parts = [input.pageTitle?.trim(), input.commentary.trim(), input.selectedText?.trim()]
    .filter(Boolean) as string[];
  return parts.join('\n\n');
}

/**
 * Embed an annotation by slug and persist the vector. Idempotent — safe to call
 * multiple times (overwrites previous vector).
 */
export async function embedAndStoreAnnotation(slug: string): Promise<{ dimensions: number }> {
  const col = await annotations();
  const ann = await col.findOne({ slug });
  if (!ann) throw new Error(`annotation ${slug} not found`);

  const text = composeEmbeddableText({
    pageTitle: ann.pageDesign?.pageTitle ?? ann.source.title,
    commentary: ann.commentary.text,
    selectedText: ann.textContent?.selectedText,
  });
  if (!text.trim()) {
    throw new Error(`annotation ${slug} has no embeddable text`);
  }

  const vec = await embedText(text);
  await col.updateOne(
    { slug },
    {
      $set: {
        uscEmbedding: vec,
        workspaceId: ann.workspaceId ?? ANNOTATE_PUBLIC_WORKSPACE,
        updatedAt: new Date(),
      },
    },
  );
  return { dimensions: vec.length };
}
