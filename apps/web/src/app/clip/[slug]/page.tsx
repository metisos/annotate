import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { annotations, comments, follows, users } from '@/lib/mongo';
import { getSessionUser } from '@/lib/auth';
import { findRelatedBundle } from '@/lib/usc/related-federated';
import { AnnotationPage } from '@/components/AnnotationPage';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  const annCol = await annotations();
  const ann = await annCol.findOne({ slug });
  if (!ann) return null;
  const authorCol = await users();
  let objectId: ObjectId | null = null;
  try {
    objectId = new ObjectId(ann.userId);
  } catch {
    /* userId not a valid ObjectId string */
  }
  const author =
    (objectId &&
      (await authorCol.findOne({ _id: objectId } as unknown as Parameters<typeof authorCol.findOne>[0]))) ||
    (await authorCol.findOne({ firebaseUid: ann.userId }));
  if (!author) return null;
  return { ann, author };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await load(slug);
  if (!loaded) return { title: 'Not found — Annotate' };
  const title = loaded.ann.pageDesign?.pageTitle ?? loaded.ann.source.title;
  const description =
    loaded.ann.pageDesign?.ogDescription ?? loaded.ann.commentary.text.slice(0, 160);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const ogImage = `${base}/api/og/${slug}`;
  return {
    title: `${title} — Annotate`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${base}/clip/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ClipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loaded = await load(slug);
  if (!loaded) notFound();

  // Fire-and-forget view increment
  void (async () => {
    const col = await annotations();
    await col.updateOne({ slug }, { $inc: { 'stats.views': 1 } });
  })();

  const viewer = await getSessionUser();

  // Comments + their authors (single query each, then de-dupe author IDs)
  const commentsCol = await comments();
  const annComments = await commentsCol
    .find({ annotationId: String(loaded.ann._id) })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  const authorIds = Array.from(new Set(annComments.map((c) => c.userId)));
  const authorIdObjects = authorIds
    .filter((id) => /^[0-9a-f]{24}$/i.test(id))
    .map((id) => new ObjectId(id));
  const authorDocs = authorIdObjects.length
    ? await (
        await users()
      )
        .find({ _id: { $in: authorIdObjects } } as unknown as Parameters<
          Awaited<ReturnType<typeof users>>['find']
        >[0])
        .toArray()
    : [];
  const commentAuthors: Record<string, { handle: string; displayName: string }> = {};
  for (const u of authorDocs) {
    commentAuthors[String(u._id)] = { handle: u.handle, displayName: u.displayName };
  }

  // Am I following the author?
  let amFollowing = false;
  if (viewer && viewer.firebaseUid !== loaded.author.firebaseUid) {
    const f = await (
      await follows()
    ).findOne({
      followerId: String(viewer._id),
      followingId: String(loaded.author._id),
    });
    amFollowing = Boolean(f);
  }

  // Related — USC semantic neighbors (internal + federated)
  const semanticText = [
    loaded.ann.pageDesign?.pageTitle,
    loaded.ann.commentary.text.slice(0, 280),
  ]
    .filter(Boolean)
    .join('\n\n');
  const relatedBundle = await findRelatedBundle({
    slug,
    embedding: loaded.ann.uscEmbedding,
    semanticText: semanticText || undefined,
    limit: 4,
  });

  return (
    <AnnotationPage
      annotation={loaded.ann}
      author={loaded.author}
      viewer={viewer}
      comments={annComments}
      commentAuthors={commentAuthors}
      amFollowing={amFollowing}
      related={relatedBundle.internal}
      relatedExternal={relatedBundle.external}
    />
  );
}
