import { NextRequest, NextResponse } from 'next/server';
import { extractNutritionFromImage } from '@/lib/ocr';

export const runtime = 'nodejs';
export const maxDuration = 60; // OCR can be slow on large images

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractNutritionFromImage(buffer);

    return NextResponse.json(result);
  } catch (e) {
    console.error('OCR error:', e);
    return NextResponse.json(
      { error: 'OCR processing failed. Try a clearer image.' },
      { status: 500 },
    );
  }
}
