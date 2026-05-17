'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { OcrNutritionResult } from '@/lib/ocr';
import { parseNutrition } from '@/lib/nutrition-label-parser';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const IMAGE_EXTENSIONS = /\.(avif|heic|heif|jpeg|jpg|png|webp)$/i;
const inputId = 'nutrition-label-image';

function isImageFile(file: File) {
  return file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name);
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function loadDrawableImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      return loadImageElement(file);
    }
  }

  return loadImageElement(file);
}

async function imageToOcrBlob(file: File): Promise<Blob> {
  const image = await loadDrawableImage(file);
  const maxWidth = 1400;
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const normalized = gray < 128 ? Math.max(0, gray * 0.8) : Math.min(255, gray * 1.15);
    data[i] = normalized;
    data[i + 1] = normalized;
    data[i + 2] = normalized;
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/png');
  });
}

async function imageToUploadFile(file: File): Promise<File> {
  if (file.size <= 3.5 * 1024 * 1024 && !/\.(heic|heif)$/i.test(file.name)) {
    return file;
  }

  const image = await loadDrawableImage(file);
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.84);
  });

  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'nutrition-label';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

function emptyOcrResult(): OcrNutritionResult {
  return {
    rawText: '',
    servingBase: 100,
    servingUnit: 'g',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    confidence: {
      calories: false,
      protein: false,
      carbs: false,
      fat: false,
      fiber: false,
      sugar: false,
      sodium: false,
      servingBase: false,
    },
  };
}

async function runBrowserOcr(file: File): Promise<OcrNutritionResult> {
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    langPath: '/tessdata',
    cacheMethod: 'none',
    gzip: false,
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });

    const ocrBlob = await imageToOcrBlob(file);
    const { data } = await worker.recognize(ocrBlob, {}, { text: true });
    const parsed = parseNutrition(data.text);
    return { rawText: data.text, ...parsed };
  } finally {
    await worker.terminate();
  }
}

export function OcrUpload({
  onExtracted,
}: {
  onExtracted: (data: OcrNutritionResult & { imageUrl?: string }) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!isImageFile(file)) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image is larger than 20MB.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      const uploadFile = await imageToUploadFile(file).catch(() => file);
      const buildFormData = (image: File) => {
        const fd = new FormData();
        fd.append('image', image);
        return fd;
      };

      const [ocrResult, uploadResult] = await Promise.allSettled([
        runBrowserOcr(file),
        fetch('/api/upload', { method: 'POST', body: buildFormData(uploadFile) }),
      ]);

      const upload =
        uploadResult.status === 'fulfilled' && uploadResult.value.ok
          ? await uploadResult.value.json()
          : { url: undefined };

      if (ocrResult.status === 'fulfilled') {
        onExtracted({ ...ocrResult.value, imageUrl: upload.url });
        toast.success('Nutrition info extracted. Please verify the values.');
        return;
      }

      if (upload.url) {
        onExtracted({ ...emptyOcrResult(), imageUrl: upload.url });
        toast.error('Image uploaded, but OCR could not read it. Enter the values manually.');
        return;
      }

      throw ocrResult.reason;
    } catch (e: any) {
      toast.error(e.message || 'Could not process image');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <label
          htmlFor={inputId}
          className="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 transition-colors hover:border-primary hover:bg-accent/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-64 rounded-md object-contain" />
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Tap to upload nutrition label</p>
                <p className="text-xs text-muted-foreground">Camera or gallery, up to 20MB</p>
              </div>
            </>
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Reading label…</span>
              </div>
            </div>
          )}
        </label>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />

        <div className="mt-3 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" disabled={loading} asChild>
            <label htmlFor={inputId} className="cursor-pointer">
              <Camera className="mr-2 h-4 w-4" />
              {preview ? 'Try another image' : 'Choose image'}
            </label>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
