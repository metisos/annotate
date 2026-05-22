import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { annotations } from '@/lib/mongo';
import { runPageDesignAgent } from '@/lib/agents/page-design';

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const me = await getRequestUser(req);
  if (!me) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const col = await annotations();
  const ann = await col.findOne({ slug });
  if (!ann) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (ann.userId !== String(me._id)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const pageDesign = await runPageDesignAgent(slug);
  return NextResponse.json({ pageDesign });
}
