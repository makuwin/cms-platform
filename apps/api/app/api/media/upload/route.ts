import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

import {
  getAuthUserFromRequest,
  hasPermission,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = getAuthUserFromRequest(request);
  if (!user || !hasPermission(user, 'media:upload')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  const mediaId = crypto.randomUUID();
  const rawFilename = file.name ?? `upload-${mediaId}`;
  const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const mimeType = file.type || 'application/octet-stream';

  const uploadsRoot = path.join(process.cwd(), 'public', 'media');
  const targetDir = path.join(uploadsRoot, mediaId);
  const targetPath = path.join(targetDir, safeFilename);

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, fileBuffer);

  const publicUrl = `/media/${mediaId}/${safeFilename}`;

  return NextResponse.json(
    {
      id: mediaId,
      filename: safeFilename,
      mimeType,
      size: file.size,
      uploadedBy: user.id,
      url: publicUrl,
    },
    { status: 201 },
  );
}
