import { NextRequest, NextResponse } from 'next/server';

import {
  Role,
  buildPermissions,
  hashPassword,
  signTokens,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateRegister } from '@/lib/validation';

const ALLOWED_ROLES: Role[] = ['admin', 'editor', 'author', 'viewer'];

export async function POST(request: NextRequest) {
  try {
    const payload = validateRegister(await request.json());

    const existing = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 },
      );
    }

    const role = (ALLOWED_ROLES.includes(payload.role as Role)
      ? payload.role
      : 'viewer') as Role;
    const passwordHash = await hashPassword(payload.password);
    const explicitPermissions = buildPermissions(role).filter(
      (perm) => !perm.includes('*'),
    );

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name ?? payload.email.split('@')[0],
        role,
        passwordHash,
        permissions: explicitPermissions,
      },
    });

    const authUser = {
      id: user.id,
      email: user.email,
      role,
      permissions: buildPermissions(role, user.permissions ?? []),
    };

    const tokens = signTokens(authUser);
    const response = NextResponse.json(
      { user: authUser, ...tokens },
      { status: 201 },
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to register user';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
