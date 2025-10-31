import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ users }, { status: 200 });
}
