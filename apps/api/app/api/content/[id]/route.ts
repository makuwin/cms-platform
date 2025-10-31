import { NextRequest, NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';
import { getAuthUserFromRequest, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateContent } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = getAuthUserFromRequest(request);
  if (!user || !hasPermission(user, 'content:read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const content = await prisma.content.findUnique({
    where: { id: params.id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      versions: {
        orderBy: { version: 'desc' },
      },
    },
  });

  if (!content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  return NextResponse.json(content, { status: 200 });
}

export async function PUT(
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

    const ownsContent = (content as { createdById?: string }).createdById
      ? (content as { createdById: string }).createdById === user.id
      : false;

    const canEdit =
      hasPermission(user, 'content:*') ||
      (ownsContent && hasPermission(user, 'content:edit:own'));

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = validateContent(await request.json());

    const updated = await prisma.content.update({
      where: { id: params.id },
      data: {
        title: payload.title,
        slug: payload.slug,
        type: payload.type,
        description: payload.description ?? null,
        updatedById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const latestVersion = await prisma.contentVersion.findFirst({
      where: { contentId: params.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const version = await prisma.contentVersion.create({
      data: {
        contentId: params.id,
        version: nextVersion,
        data: payload.data as Prisma.InputJsonValue,
        createdById: user.id,
      },
    });

    return NextResponse.json(
      {
        ...updated,
        latestVersion: version,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update content';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = getAuthUserFromRequest(request);
  if (!user || !hasPermission(user, 'content:*')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.content.delete({
    where: { id: params.id },
  });

  return NextResponse.json(null, { status: 204 });
}
