import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
    },
  });

  if (!dbUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user: dbUser }, { status: 200 });
}
