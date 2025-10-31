import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { Role, buildPermissions, hashPassword, signTokens } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateRegister } from '@/lib/validation';
import { DEFAULT_ROLE, PRIMARY_ADMIN_ROLE } from '@/lib/roles';

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

    const passwordHash = await hashPassword(payload.password);
    const adminLockValue = 'PRIMARY';

    const { user, role } = await prisma.$transaction(async (tx) => {
      const shouldPromote = (await tx.user.count()) === 0;

      const isPrimaryAdminLockViolation = (error: unknown) => {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          )
        ) {
          return false;
        }

        const target = error.meta?.target;
        if (Array.isArray(target)) {
          return target.includes('primaryAdminLock');
        }

        return target === 'primaryAdminLock';
      };

      const createUser = async (
        assignedRole: Role,
        withPrimaryAdminLock: boolean,
      ) => {
        const explicitPermissions = buildPermissions(assignedRole).filter(
          (perm) => !perm.includes('*'),
        );

        const data = {
          email: payload.email,
          name: payload.name,
          role: assignedRole,
          passwordHash,
          permissions: explicitPermissions,
          ...(withPrimaryAdminLock ? { primaryAdminLock: adminLockValue } : {}),
        };

        const created = await tx.user.create({ data });
        return { user: created, role: assignedRole };
      };

      if (!shouldPromote) {
        return createUser(DEFAULT_ROLE, false);
      }

      try {
        return await createUser(PRIMARY_ADMIN_ROLE, true);
      } catch (error) {
        if (isPrimaryAdminLockViolation(error)) {
          return createUser(DEFAULT_ROLE, false);
        }

        throw error;
      }
    });

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
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
