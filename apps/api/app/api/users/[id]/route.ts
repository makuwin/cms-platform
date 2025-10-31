import { NextRequest, NextResponse } from 'next/server';

import { Role, buildPermissions, getAuthUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_OPTIONS } from '@/lib/roles';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role as Role | undefined;

  if (!role || !ROLE_OPTIONS.includes(role)) {
    return NextResponse.json({ error: 'Invalid role supplied' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      role,
      permissions: buildPermissions(role).filter((perm) => !perm.includes('*')),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ user: updated }, { status: 200 });
}
