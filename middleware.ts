import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block access to Calendar (root) and Assignments pages
  if (pathname === '/' || pathname.startsWith('/assignments')) {
    const url = request.nextUrl.clone();
    url.pathname = '/quests';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/assignments/:path*'],
};


