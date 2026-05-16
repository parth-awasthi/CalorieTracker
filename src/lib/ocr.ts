import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

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
async function preprocessImages(buffer: Buffer): Promise<Buffer[]> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const stats = await image.clone().grayscale().stats();
  const meanBrightness = stats.channels[0]?.mean ?? 255;

  const pipeline = image
    .resize({ width: 1600, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen();

  const normal = await (metadata.format === 'webp' ? pipeline : pipeline.png()).toBuffer();

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
async function runTesseract(buffer: Buffer): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

const NUMBER_PATTERN = /[a-z]*\d+(?:[.,]\d+)?[a-z]*/gi;

function normalizeOcrText(rawText: string): string {
  return rawText
    .toLowerCase()
    .replace(/[|]/g, '')
    .replace(/,/g, '.');
}

function parseNumber(value: string): number {
  const normalized = value
    .toLowerCase()
    .replace(/o/g, '0')
    .replace(/[il]/g, '1')
    .replace(/a(?=\d)/g, '4')
    .replace(/(?<=\d)a/g, '4')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');

  return parseFloat(normalized);
}

function getNumbers(text: string): number[] {
  const withoutUnits = text
    .replace(/\((?:g|9|@|®|mg|kcal|cal)\)/gi, ' ')
    .replace(/\((?:g|9|@|®|mg|kcal|cal)\s+(?=[\[\d])/gi, ' ');

  return Array.from(withoutUnits.matchAll(NUMBER_PATTERN), (match) => parseNumber(match[0]))
    .filter((value) => Number.isFinite(value));
}

function repairMissingDecimal(value: number, nutrient: keyof Omit<OcrNutritionResult, 'rawText' | 'confidence'>): number {
  if (!Number.isInteger(value)) return value;

  if (nutrient === 'calories' && value >= 1000) {
    return value / 10;
  }

  const shouldShift =
    (['carbs', 'fat', 'fiber'].includes(nutrient) && value >= 50) ||
    (nutrient === 'sugar' && value >= 20) ||
    (nutrient === 'sodium' && value >= 300);

  return shouldShift ? value / 10 : value;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function decimalCandidates(
  value: number,
  nutrient: keyof Omit<OcrNutritionResult, 'rawText' | 'confidence'>,
): number[] {
  if (!Number.isInteger(value)) return [value];

  return Array.from(new Set([
    repairMissingDecimal(value, nutrient),
    value,
    value / 10,
    value / 100,
  ]));
}

function repairTableRowValue(
  numbers: number[],
  nutrient: keyof Omit<OcrNutritionResult, 'rawText' | 'confidence'>,
  servingBase: number,
  tableHasPer100Column: boolean,
): number {
  const first = numbers[0];
  const second = numbers[1];
  const repairedFirst = repairMissingDecimal(first, nutrient);

  if (tableHasPer100Column && servingBase !== 100 && second !== undefined && Number.isInteger(first)) {
    for (const secondCandidate of decimalCandidates(second, nutrient)) {
      const expectedFromPer100 = secondCandidate * (servingBase / 100);
      const firstCandidate = decimalCandidates(first, nutrient).find((candidate) => {
        return (
          expectedFromPer100 > 0 &&
          Math.abs(candidate - expectedFromPer100) / expectedFromPer100 < 0.25
        );
      });

      if (firstCandidate !== undefined) {
        return Math.abs(firstCandidate - expectedFromPer100) <= 0.1
          ? firstCandidate
          : roundToOneDecimal(expectedFromPer100);
      }
    }
  }

  return repairedFirst;
}

function repairMacroByCalories(
  value: number,
  nutrient: keyof Omit<OcrNutritionResult, 'rawText' | 'confidence'>,
  calories: number,
): number {
  if (!calories || !Number.isInteger(value)) return value;

  const caloriesPerGram =
    nutrient === 'fat' ? 9 :
    ['protein', 'carbs', 'sugar', 'fiber'].includes(nutrient) ? 4 :
    0;

  if (!caloriesPerGram) return value;

  const maxPlausibleGrams = (calories / caloriesPerGram) * 1.2;
  if (value <= maxPlausibleGrams) return value;

  return decimalCandidates(value, nutrient).find((candidate) => candidate <= maxPlausibleGrams) ?? value;
}

function numbersFromLine(lines: string[], aliases: RegExp[]): number[] | null {
  for (const alias of aliases) {
    for (const line of lines) {
      if (!alias.test(line)) continue;

      const numbers = getNumbers(line);
      if (numbers.length) return numbers;
    }
  }

  return null;
}

/**
 * Pattern-based nutrition parser.
 *
 * Approach:
 *   Prefer the first number on the nutrient's own OCR line. Nutrition tables often
 *   contain per-serving and per-100g columns, so line-aware parsing avoids grabbing
 *   sub-row values like mono-unsaturated fat for total fat.
 */
export function parseNutrition(rawText: string): Omit<OcrNutritionResult, 'rawText'> {
  const normalized = normalizeOcrText(rawText);
  const text = normalized.replace(/\s+/g, ' ');
  const tableHasPer100Column = /per\s*100\s*(?:g|ml|m)\b/.test(text);
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const confidence: OcrNutritionResult['confidence'] = {
    calories: false,
    protein: false,
    carbs: false,
    fat: false,
    fiber: false,
    sugar: false,
    sodium: false,
    servingBase: false,
  };

  // Serving base: "per 100g", "per 100 ml", "serving size 32g", "serving size 200 ml"
  let servingBase = 100;
  let servingUnit: OcrNutritionResult['servingUnit'] = /\bml\b/.test(text) ? 'ml' : 'g';
  const servingMatch =
    text.match(/amount\s+per\s+(?:pack|serving)[\s\S]{0,80}?serving\s*size[^\d]*(\d{1,4})\s*(g|ml|m)\b/) ||
    text.match(/serving\s*size[^\d]*(\d{1,4})\s*(g|ml|m)\b/) ||
    text.match(/per\s*(\d{1,4})\s*(g|ml|m)\b/) ||
    text.match(/\((\d{1,4})\s*(g|ml|m)\)/);
  if (servingMatch) {
    servingBase = parseNumber(servingMatch[1]);
    servingUnit = servingMatch[2] === 'g' ? 'g' : 'ml';
    confidence.servingBase = true;
  }

  const pickByLine = (
    aliases: RegExp[],
    field: keyof OcrNutritionResult['confidence'],
    nutrient: keyof Omit<OcrNutritionResult, 'rawText' | 'confidence'>,
  ): number => {
    const numbers = numbersFromLine(lines, aliases);
    if (numbers) {
      confidence[field] = true;
      return repairTableRowValue(numbers, nutrient, servingBase, tableHasPer100Column);
    }

    return 0;
  };

  const pickFallback = (
    aliases: string[],
    unit: 'g' | 'mg' | 'kcal',
    field: keyof OcrNutritionResult['confidence'],
    nutrient: keyof Omit<OcrNutritionResult, 'rawText' | 'confidence'>,
  ): number => {
    const unitPattern =
      unit === 'g' ? '\\s*g\\b' :
      unit === 'mg' ? '\\s*mg\\b' :
      '\\s*(?:kcal|cal)?';

    for (const alias of aliases) {
      const re = new RegExp(`${alias}[^\\d-]{0,30}(\\d+(?:\\.\\d+)?)${unitPattern}`, 'i');
      const m = text.match(re);
      if (m) {
        confidence[field] = true;
        return repairMissingDecimal(parseNumber(m[1]), nutrient);
      }
    }

    return 0;
  };

  // Calories: try "energy ... kcal" first, then plain "calories"
  let calories =
    pickByLine([/\benergy\b/, /\bcalories\b/], 'calories', 'calories') ||
    pickFallback(['energy[^\\d]{0,30}', 'calories'], 'kcal', 'calories', 'calories');
  // Sometimes label only has kJ — convert (1 kcal ≈ 4.184 kJ)
  if (!calories) {
    const kj = text.match(/(\d+(?:\.\d+)?)\s*kj/);
    if (kj) {
      calories = Math.round(parseNumber(kj[1]) / 4.184);
      confidence.calories = true;
    }
  }

  const proteinRaw =
    pickByLine([/\bprotein\b/, /\bpro(?:t|f)?ein\b/, /\bproin\b/, /\bpofein\b/], 'protein', 'protein') ||
    pickFallback(['protein', 'pro(?:t|f)?ein', 'proin', 'pofein'], 'g', 'protein', 'protein');
  const carbsRaw =
    pickByLine([/\bcarbohydrates?\b/, /\bcarbs\b/], 'carbs', 'carbs') ||
    pickFallback(['total carbohydrate', 'carbohydrates', 'carbohydrate', 'carbs'], 'g', 'carbs', 'carbs');
  const fatRaw =
    pickByLine([/\btotal\s*fats?\b/, /^fats?\b/], 'fat', 'fat') ||
    pickFallback(['total fats?', '\\bfats?\\b'], 'g', 'fat', 'fat');
  const fiberRaw =
    pickByLine([/\bdietary\s+fib(?:er|re)\b/, /\bfib(?:er|re)\b/], 'fiber', 'fiber') ||
    pickFallback(['dietary fiber', 'dietary fibre', 'fiber', 'fibre'], 'g', 'fiber', 'fiber');
  const sugarRaw =
    pickByLine([/\btotal\s+sugars?\b/, /\bt[oa]l\s+sugars?\b/, /\btor\s+sugars?\b/, /^\s*sugars?\b/], 'sugar', 'sugar') ||
    pickFallback(['total sugars', 't[oa]l sugars', 'tor sugars', 'sugars', 'sugar'], 'g', 'sugar', 'sugar');

  const protein = repairMacroByCalories(proteinRaw, 'protein', calories);
  const carbs = repairMacroByCalories(carbsRaw, 'carbs', calories);
  const fat = repairMacroByCalories(fatRaw, 'fat', calories);
  const fiber = repairMacroByCalories(fiberRaw, 'fiber', calories);
  const sugar = repairMacroByCalories(sugarRaw, 'sugar', calories);

  // Sodium: usually in mg but sometimes shown in g
  let sodium =
    pickByLine([/\bsodium\b/, /\bsodan\b/], 'sodium', 'sodium') ||
    pickFallback(['sodium', 'sodan'], 'mg', 'sodium', 'sodium');
  if (!sodium) {
    const sodiumG = text.match(/sodium[^\d-]{0,30}(\d+(?:\.\d+)?)\s*g\b/i);
    if (sodiumG) {
      sodium = parseNumber(sodiumG[1]) * 1000;
      confidence.sodium = true;
    }
  }
  // Or salt → sodium (salt × 0.4 ≈ sodium)
  if (!sodium) {
    const salt = text.match(/salt[^\d-]{0,30}(\d+(?:\.\d+)?)\s*g\b/i);
    if (salt) {
      sodium = parseNumber(salt[1]) * 400;
      confidence.sodium = true;
    }
  }

  return { servingBase, servingUnit, calories, protein, carbs, fat, fiber, sugar, sodium, confidence };
}

export async function extractNutritionFromImage(buffer: Buffer): Promise<OcrNutritionResult> {
  const processedVariants = await preprocessImages(buffer);
  const results: OcrNutritionResult[] = [];

  for (const processed of processedVariants) {
    const rawText = await runTesseract(processed);
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
