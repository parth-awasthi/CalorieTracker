import { existsSync } from 'fs';
import path from 'path';
import { createWorker, PSM } from 'tesseract.js';
import sharp from 'sharp';
import { parseNutrition } from '@/lib/nutrition-label-parser';

export type OcrNutritionResult = {
  rawText: string;
  servingBase: number;
  servingUnit: 'g' | 'ml';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  confidence: {
    [K in 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium' | 'servingBase']: boolean;
  };
};

/**
 * Preprocess image for better OCR accuracy:
 * - Grayscale to drop color noise
 * - Normalize contrast
 * - Resize to a sensible width if huge (phone photos can be 4000+px)
 */
const isVercel = process.env.VERCEL === '1';

async function preprocessImages(buffer: Buffer, fast = false): Promise<Buffer[]> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const stats = await image.clone().grayscale().stats();
  const meanBrightness = stats.channels[0]?.mean ?? 255;

  const pipeline = image
    .resize({ width: fast ? 1400 : 1600, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen();

  const normal = await (metadata.format === 'webp' ? pipeline : pipeline.png()).toBuffer();

  if (fast) {
    return [normal];
  }

  if (meanBrightness >= 115) {
    const upscaled = await sharp(buffer)
      .resize({ width: 2400, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();
    const linear = await sharp(buffer)
      .resize({ width: 2400, withoutEnlargement: false })
      .grayscale()
      .linear(1.5, -20)
      .sharpen()
      .png()
      .toBuffer();

    return [normal, upscaled, linear];
  }

  const darkEnhanced = await sharp(buffer)
    .resize({ width: 2400, withoutEnlargement: false })
    .grayscale()
    .negate()
    .normalize()
    .threshold(150)
    .png()
    .toBuffer();

  return [normal, darkEnhanced];
}

/**
 * Run Tesseract OCR on a preprocessed image buffer.
 */
type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

declare global {
  // eslint-disable-next-line no-var
  var __ocrWorkerPromise: Promise<TesseractWorker> | undefined;
}

function createOcrWorker(): Promise<TesseractWorker> {
  const trainedDataPath = path.join(process.cwd(), 'eng.traineddata');
  const options = existsSync(trainedDataPath)
    ? { langPath: process.cwd(), cacheMethod: 'none', gzip: false }
    : {};

  return createWorker('eng', 1, options).then(async (worker) => {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });
    return worker;
  });
}

async function getOcrWorker(): Promise<TesseractWorker> {
  if (!globalThis.__ocrWorkerPromise) {
    globalThis.__ocrWorkerPromise = createOcrWorker();
  }

  return globalThis.__ocrWorkerPromise;
}

async function runTesseract(buffer: Buffer, keepWorkerAlive = false): Promise<string> {
  const worker = keepWorkerAlive ? await getOcrWorker() : await createOcrWorker();
  try {
    const { data } = await worker.recognize(buffer, {}, { text: true });
    return data.text;
  } catch (error) {
    if (keepWorkerAlive) {
      globalThis.__ocrWorkerPromise = undefined;
    }
    throw error;
  } finally {
    if (!keepWorkerAlive) {
      await worker.terminate();
    }
  }
}

export async function extractNutritionFromImage(buffer: Buffer): Promise<OcrNutritionResult> {
  const processedVariants = await preprocessImages(buffer, isVercel);
  const results: OcrNutritionResult[] = [];

  for (const processed of processedVariants) {
    const rawText = await runTesseract(processed, isVercel);
    const parsed = parseNutrition(rawText);
    results.push({ rawText, ...parsed });
  }

  return results.sort((a, b) => scoreOcrResult(b) - scoreOcrResult(a))[0];
}

function scoreOcrResult(result: OcrNutritionResult): number {
  const confidenceScore = Object.values(result.confidence).filter(Boolean).length * 10;
  const nutrientScore = [
    result.calories,
    result.protein,
    result.carbs,
    result.fat,
    result.sugar,
    result.sodium,
  ].filter((value) => value > 0).length * 3;

  return confidenceScore + nutrientScore;
}
