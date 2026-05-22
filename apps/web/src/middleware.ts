import { NextResponse, type NextRequest } from 'next/server';

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin.startsWith('chrome-extension://')) return true;
  if (origin === 'http://localhost:3100') return true;
  if (origin === 'https://annotate.metisos.co') return true;
  if (origin === process.env.NEXT_PUBLIC_APP_URL) return true;
  return false;
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const origin = req.headers.get('origin');
  const allow = isAllowedOrigin(origin) ? origin! : '';

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': allow,
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-allow-credentials': 'true',
        'access-control-max-age': '86400',
        vary: 'origin',
      },
    });
  }

  const res = NextResponse.next();
  if (allow) {
    res.headers.set('access-control-allow-origin', allow);
    res.headers.set('access-control-allow-credentials', 'true');
    res.headers.set('vary', 'origin');
  }
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
