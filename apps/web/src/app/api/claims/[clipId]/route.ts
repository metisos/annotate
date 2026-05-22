import { NextResponse } from 'next/server';
import { annotations, claims } from '@/lib/mongo';

type Ctx = { params: Promise<{ clipId: string }> };

interface ClaimBody {
  claimantName: string;
  claimantEmail: string;
  originalContentUrl: string;
  reason: string;
  evidence?: string;
}

export async function POST(req: Request, { params }: Ctx) {
  const { clipId } = await params; // clipId = slug for now
  const annCol = await annotations();
  const ann = await annCol.findOne({ slug: clipId });
  if (!ann) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let body: ClaimBody;
  try {
    body = (await req.json()) as ClaimBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  for (const k of ['claimantName', 'claimantEmail', 'originalContentUrl', 'reason'] as const) {
    if (!body[k]?.trim()) return NextResponse.json({ error: `${k} required` }, { status: 400 });
  }

  const now = new Date();
  const annId = String(ann._id);

  const claimsCol = await claims();
  await claimsCol.insertOne({
    annotationId: annId,
    claimantName: body.claimantName.trim(),
    claimantEmail: body.claimantEmail.trim(),
    originalContentUrl: body.originalContentUrl.trim(),
    reason: body.reason.trim(),
    evidence: body.evidence?.trim() ?? '',
    status: 'pending',
    createdAt: now,
  });

  await annCol.updateOne(
    { slug: clipId },
    {
      $set: {
        claim: {
          filed: true,
          filedAt: now,
          claimantEmail: body.claimantEmail.trim(),
          reason: body.reason.trim(),
          status: 'pending',
        },
        updatedAt: now,
      },
    },
  );

  return NextResponse.json({ ok: true });
}
