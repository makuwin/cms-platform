import { NextRequest, NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';
import { getAuthUserFromRequest, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateSearchQuery } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = getAuthUserFromRequest(request);
  if (!user || !hasPermission(user, 'content:read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const filters = validateSearchQuery(request.nextUrl.searchParams);
    const conditions: Prisma.ContentWhereInput = {
      status: 'published',
    };

    if (filters.type) {
      conditions.type = filters.type;
    }

    if (filters.author) {
      conditions.createdBy = {
        is: { email: filters.author },
      };
    }

    if (filters.date) {
      const date = new Date(filters.date);
      if (!Number.isNaN(date.getTime())) {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        conditions.publishedAt = {
          gte: date,
          lt: nextDay,
        };
      }
    }

    const results = await prisma.content.findMany({
      where: {
        ...conditions,
        OR: [
          { title: { contains: filters.query, mode: 'insensitive' } },
          { slug: { contains: filters.query, mode: 'insensitive' } },
          { description: { contains: filters.query, mode: 'insensitive' } },
        ],
      },
      orderBy: {
        publishedAt: 'desc',
      },
      include: {
        publishedVersion: true,
      },
      take: 25,
    });

    return NextResponse.json({ results, filters }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
