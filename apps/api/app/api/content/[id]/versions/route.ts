import { NextRequest, NextResponse } from 'next/server';

import {
  getAuthUserFromRequest,
  hasPermission,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = getAuthUserFromRequest(request);
  if (!user || !hasPermission(user, 'content:read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const versions = await prisma.contentVersion.findMany({
    where: { contentId: params.id },
    orderBy: { version: 'desc' },
  });

  return NextResponse.json({ versions }, { status: 200 });
}
