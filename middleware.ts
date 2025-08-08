import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Basic auth for admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('authorization') || '';
    const expectedUser = process.env.ADMIN_BASIC_USER || '';
    const expectedPass = process.env.ADMIN_BASIC_PASS || '';
    const expected = 'Basic ' + Buffer.from(`${expectedUser}:${expectedPass}`).toString('base64');
    if (!expectedUser || !expectedPass || authHeader !== expected) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
      });
    }
  }

  // Block access to Assignments pages only
  if (pathname.startsWith('/assignments')) {
    const url = request.nextUrl.clone();
    url.pathname = '/quests';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/assignments/:path*', '/admin/:path*', '/api/admin/:path*'],
};


