import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `${randomUUID()}.${ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`uploads/${fileName}`, buffer, {
        access: 'public',
        contentType: file.type || 'application/octet-stream',
      });

      return NextResponse.json({ url: blob.url });
    }

    const dir = join(process.cwd(), 'public', 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
