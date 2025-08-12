import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Basic auth for admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    try {
      // Do not allow static cache to bypass auth
      const resHeaders = new Headers();
      resHeaders.set('Cache-Control', 'no-store');
      const authHeader = request.headers.get('authorization') || '';
      const expectedUser = (process.env.ADMIN_BASIC_USER || '').trim();
      const expectedPass = (process.env.ADMIN_BASIC_PASS || '').trim();

      // Always require auth when hitting admin routes
      if (!expectedUser || !expectedPass) {
        return new NextResponse('Admin credentials not configured', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"', ...Object.fromEntries(resHeaders) } });
      }

      // authorization: "Basic base64(user:pass)"
      const [scheme, encoded] = authHeader.split(' ');
      if (scheme !== 'Basic' || !encoded) {
        return new NextResponse('Authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"', ...Object.fromEntries(resHeaders) } });
      }

      const base64Decode = (b64: string) => {
        try { return atob(b64); } catch { return Buffer.from(b64, 'base64').toString('utf8'); }
      };
      const decoded = base64Decode(encoded);
      const sep = decoded.indexOf(':');
      const user = sep >= 0 ? decoded.slice(0, sep) : '';
      const pass = sep >= 0 ? decoded.slice(sep + 1) : '';
      if (user !== expectedUser || pass !== expectedPass) {
        return new NextResponse('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"', ...Object.fromEntries(resHeaders) } });
      }
    } catch {
      return new NextResponse('Authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
    }
  }

  // Block access to Assignments pages
  if (pathname.startsWith('/assignments')) {
    const url = request.nextUrl.clone();
    url.pathname = '/quests';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Block access to Calendar pages
  if (pathname.startsWith('/calendar')) {
  // Block access to Skill Tree pages
  if (pathname.startsWith('/skill-tree')) {
    const url = request.nextUrl.clone();
    url.pathname = '/quests';
    url.search = '';
    return NextResponse.redirect(url);
  }
    const url = request.nextUrl.clone();
    url.pathname = '/quests';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/assignments/:path*', '/calendar/:path*', '/skill-tree/:path*', '/admin/:path*', '/api/admin/:path*'],
};


