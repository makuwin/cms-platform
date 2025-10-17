import { NextRequest, NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';
import { getAuthUserFromRequest, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateContent } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = getAuthUserFromRequest(request);
  if (!user || !hasPermission(user, 'content:read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') ?? undefined;
  const type = searchParams.get('type') ?? undefined;

  const content = await prisma.content.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  return NextResponse.json({ content }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUserFromRequest(request);
    if (!user || !hasPermission(user, 'content:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = validateContent(await request.json());

    const created = await prisma.content.create({
      data: {
        title: payload.title,
        slug: payload.slug,
        type: payload.type,
        status: 'draft',
        createdById: user.id,
        updatedById: user.id,
      },
    });

    const version = await prisma.contentVersion.create({
      data: {
        contentId: created.id,
        version: 1,
        data: payload.data as Prisma.InputJsonValue,
        createdById: user.id,
      },
    });

    const response = {
      ...created,
      versions: [version],
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create content';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
