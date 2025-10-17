import { NextRequest, NextResponse } from 'next/server';

import { buildPermissions, signTokens, verifyRefreshToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const refreshToken =
    request.cookies.get('refresh_token')?.value ??
    request.headers.get('x-refresh-token') ??
    (body as { refreshToken?: string }).refreshToken ??
    null;

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Refresh token required' },
      { status: 400 },
    );
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const authUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: buildPermissions(user.role, user.permissions ?? []),
  };

  const tokens = signTokens(authUser);
  const response = NextResponse.json(
    { user: authUser, ...tokens },
    { status: 200 },
  );

  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set('access_token', tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 60 * 15,
    path: '/',
  });
  response.cookies.set('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 60 * 60 * 24 * 14,
    path: '/',
  });

  return response;
}
