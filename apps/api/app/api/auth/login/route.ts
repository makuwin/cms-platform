import { NextRequest, NextResponse } from 'next/server';

import { signTokens, buildPermissions, comparePassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateLogin } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const credentials = validateLogin(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    const storedHash =
      (user as { passwordHash?: string }).passwordHash ??
      (user as { password?: string }).password ??
      '';

    if (!storedHash) {
      return NextResponse.json(
        { error: 'User password is not set' },
        { status: 400 },
      );
    }

    const passwordValid = await comparePassword(
      credentials.password,
      storedHash,
    );
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    const role = (user as { role?: string }).role ?? 'viewer';
    const explicitPermissions =
      (user as { permissions?: string[] }).permissions ?? [];

    const authUser = {
      id: (user as { id: string }).id,
      email: credentials.email,
      role,
      permissions: buildPermissions(role, explicitPermissions),
    };

    const { accessToken, refreshToken } = signTokens(authUser);
    const response = NextResponse.json(
      { user: authUser, accessToken, refreshToken },
      { status: 200 },
    );

    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 60 * 15,
      path: '/',
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 60 * 60 * 24 * 14,
      path: '/',
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to login user';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
