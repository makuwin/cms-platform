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
  const filename = file.name ?? `upload-${mediaId}`;
  const mimeType = file.type || 'application/octet-stream';

  // TODO: Persist file to object storage / CDN.

  return NextResponse.json(
    {
      id: mediaId,
      filename,
      mimeType,
      size: file.size,
      uploadedBy: user.id,
      url: `/media/${mediaId}/${filename}`,
    },
    { status: 201 },
  );
}
