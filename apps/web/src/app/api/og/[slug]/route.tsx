import { ImageResponse } from 'next/og';
import { ObjectId } from 'mongodb';
import { annotations, users } from '@/lib/mongo';
import { THEMES, type ThemeName } from '@annotate/shared';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ slug: string }> };

const ACCENT_DEFAULT = '#d34a1c';

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const col = await annotations();
  const ann = await col.findOne({ slug });

  if (!ann) {
    return new ImageResponse(<NotFound />, { width: 1200, height: 630 });
  }

  // Look up author
  let authorName = '';
  let authorHandle = '';
  try {
    const usersCol = await users();
    const u = await usersCol.findOne(
      /^[0-9a-f]{24}$/i.test(ann.userId)
        ? ({ _id: new ObjectId(ann.userId) } as unknown as Parameters<typeof usersCol.findOne>[0])
        : { firebaseUid: ann.userId },
    );
    if (u) {
      authorName = u.displayName;
      authorHandle = u.handle;
    }
  } catch {
    /* swallow */
  }

  const theme = (ann.pageDesign?.theme ?? 'conversation') as ThemeName;
  const tokens = THEMES[theme];
  const accent = tokens?.accentColor ?? ACCENT_DEFAULT;
  const tint = tokens?.tintColor ?? '#fef0e7';
  const title = ann.pageDesign?.pageTitle ?? ann.source.title;
  const domain = ann.source.domain;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#fbfaf6',
          padding: 80,
          position: 'relative',
        }}
      >
        {/* Theme accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 12,
            background: accent,
            display: 'flex',
          }}
        />

        {/* Top row: wordmark + theme */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 36,
                fontFamily: 'serif',
                fontWeight: 500,
                color: '#14120e',
                letterSpacing: '-0.025em',
              }}
            >
              Annotate
            </span>
            <span style={{ fontSize: 36, fontStyle: 'italic', color: accent, marginLeft: 2 }}>
              .
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 14px',
              background: tint,
              borderRadius: 999,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 5, background: accent, display: 'flex' }} />
            <span
              style={{
                fontSize: 16,
                fontFamily: 'monospace',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#14120e',
              }}
            >
              {theme}
            </span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <div
            style={{
              fontSize: title.length > 80 ? 60 : title.length > 50 ? 72 : 88,
              lineHeight: 1.02,
              letterSpacing: '-0.035em',
              fontFamily: 'serif',
              fontWeight: 500,
              color: '#14120e',
              maxWidth: '100%',
              display: 'flex',
            }}
          >
            {title.slice(0, 180)}
          </div>
        </div>

        {/* Footer: byline + domain */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 28,
            borderTop: '1px solid #e9e3d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 14,
                fontFamily: 'monospace',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#8c877e',
              }}
            >
              Annotated by
            </div>
            <div style={{ fontSize: 28, marginTop: 6, color: '#14120e', fontWeight: 500, display: 'flex' }}>
              {authorName || 'Anonymous'}
              {authorHandle && (
                <span style={{ marginLeft: 12, color: '#8c877e', fontFamily: 'monospace', fontSize: 22 }}>
                  @{authorHandle}
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              fontFamily: 'monospace',
              letterSpacing: '0.08em',
              color: '#8c877e',
              display: 'flex',
            }}
          >
            {domain}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'cache-control': 'public, max-age=86400, s-maxage=86400',
      },
    },
  );
}

function NotFound() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fbfaf6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'serif',
        fontSize: 64,
        color: '#14120e',
      }}
    >
      Not found
    </div>
  );
}
