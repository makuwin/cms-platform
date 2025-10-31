import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STATUS_OPTIONS = ['draft', 'review', 'published', 'archived'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const content = await prisma.content.findUnique({
      where: { id: params.id },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const ownsContent =
      content.createdById && content.createdById === user.id;

    const canEditStatus =
      hasPermission(user, 'content:*') ||
      (ownsContent && hasPermission(user, 'content:edit:own'));

    if (!canEditStatus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const nextStatus = typeof body?.status === 'string' ? body.status.trim() : '';

    if (!STATUS_OPTIONS.includes(nextStatus as (typeof STATUS_OPTIONS)[number])) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const isPublishing = nextStatus === 'published' && content.status !== 'published';
    const isUnpublishing =
      content.status === 'published' && nextStatus !== 'published';

    const updated = await prisma.content.update({
      where: { id: params.id },
      data: {
        status: nextStatus,
        publishedAt: isPublishing
          ? new Date()
          : isUnpublishing
            ? null
            : content.publishedAt,
      },
      select: {
        id: true,
        status: true,
        publishedAt: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update status';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

