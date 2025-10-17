import { NextRequest, NextResponse } from 'next/server';

import {
  getAuthUserFromRequest,
  hasPermission,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = getAuthUserFromRequest(request);
  if (!user || !hasPermission(user, 'content:*')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const content = await prisma.content.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  const latestVersion = content.versions.at(0);
  if (!latestVersion) {
    return NextResponse.json(
      { error: 'Content has no versions to publish' },
      { status: 400 },
    );
  }

  const now = new Date();

  const [updatedContent, publishedVersion] = await prisma.$transaction([
    prisma.content.update({
      where: { id: params.id },
      data: {
        status: 'published',
        publishedAt: now,
        updatedById: user.id,
      },
    }),
    prisma.contentVersion.update({
      where: { id: latestVersion.id },
      data: {
        publishedAt: now,
      },
    }),
  ]);

  return NextResponse.json(
    { content: updatedContent, version: publishedVersion },
    { status: 200 },
  );
}
