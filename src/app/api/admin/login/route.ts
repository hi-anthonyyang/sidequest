import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const expectedUser = (process.env.ADMIN_BASIC_USER || '').trim();
    const expectedPass = (process.env.ADMIN_BASIC_PASS || '').trim();

    if (username === expectedUser && password === expectedPass) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set('admin_auth', 'ok', {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/admin',
        maxAge: 60 * 60 * 8, // 8 hours
      });
      return res;
    }
    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}


