export type ParsedNutritionResult = {
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

function repairMissingDecimal(value: number, nutrient: keyof Omit<ParsedNutritionResult, 'confidence'>): number {
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

function decimalCandidates(value: number, nutrient: keyof Omit<ParsedNutritionResult, 'confidence'>): number[] {
  if (!Number.isInteger(value)) return [value];
  return Array.from(new Set([repairMissingDecimal(value, nutrient), value, value / 10, value / 100]));
}

function repairTableRowValue(
  numbers: number[],
  nutrient: keyof Omit<ParsedNutritionResult, 'confidence'>,
  servingBase: number,
  tableHasPer100Column: boolean,
  servingColumnIndex: number | null,
): number {
  const first = numbers[0];
  const second = numbers[1];
  const repairedFirst = repairMissingDecimal(first, nutrient);

  if (servingColumnIndex !== null && numbers[servingColumnIndex] !== undefined) {
    return repairMissingDecimal(numbers[servingColumnIndex], nutrient);
  }

  if (tableHasPer100Column && servingBase !== 100 && second !== undefined && Number.isInteger(first)) {
    for (const secondCandidate of decimalCandidates(second, nutrient)) {
      const expectedFromPer100 = secondCandidate * (servingBase / 100);
      const firstCandidate = decimalCandidates(first, nutrient).find((candidate) => (
        expectedFromPer100 > 0 &&
        Math.abs(candidate - expectedFromPer100) / expectedFromPer100 < 0.25
      ));

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
  nutrient: keyof Omit<ParsedNutritionResult, 'confidence'>,
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
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!alias.test(line)) continue;

      const numbers = getNumbers(line);
      if (numbers.length) return numbers;

      const followingNumbers: number[] = [];
      for (const nextLine of lines.slice(index + 1, index + 6)) {
        if (isNutrientLabelLine(nextLine)) break;

        const nextNumbers = getNumbers(nextLine);
        if (nextNumbers.length === 1) {
          followingNumbers.push(nextNumbers[0]);
        } else if (nextNumbers.length > 1) {
          followingNumbers.push(...nextNumbers);
        }
      }

      if (followingNumbers.length) return followingNumbers;
    }
  }

  return null;
}

function isNutrientLabelLine(line: string): boolean {
  return /\b(?:energy|calories|protein|total\s+fat|fats?|saturated\s+fat|trans\s+fat|cholesterol|carbohydrates?|carbs|dietary\s+fib(?:er|re)|fib(?:er|re)|total\s+sugars?|sugars?|added\s+sugars?|total\s+salt|sodium|probiotics)\b/.test(line);
}

function detectServingColumnIndex(
  lines: string[],
  servingBase: number,
  servingUnit: ParsedNutritionResult['servingUnit'],
): number | null {
  const firstNutrientLine = lines.findIndex((line) => (
    /\b(?:energy|calories|protein|carbohydrates?|total\s*fats?)\b/.test(line)
  ));
  const headerText = lines
    .slice(0, firstNutrientLine === -1 ? Math.min(lines.length, 8) : firstNutrientLine)
    .join(' ');
  const columns = Array.from(
    headerText.matchAll(/amount\s+per\s+(?:pack|serving)|per\s*(?:serve|serving)|per\s*(\d{1,4})\s*(g|ml|m)\b/g),
    (match) => {
      if (match[1] === undefined) {
        return { kind: 'serving' as const, index: match.index ?? 0 };
      }

      const unit = match[2] === 'g' ? 'g' : 'ml';
      const value = parseNumber(match[1]);
      return {
        kind: unit === servingUnit && value === servingBase
          ? 'serving' as const
          : unit === servingUnit && value === 100
            ? 'per100' as const
            : 'other' as const,
        index: match.index ?? 0,
      };
    },
  ).sort((a, b) => a.index - b.index);

  if (!columns.length) return null;

  const servingIndex = columns.findIndex((column) => column.kind === 'serving');
  if (servingIndex !== -1) return servingIndex;

  const per100Index = columns.findIndex((column) => column.kind === 'per100');
  if (servingBase === 100 && per100Index !== -1) return per100Index;

  return null;
}

export function parseNutrition(rawText: string): ParsedNutritionResult {
  const normalized = normalizeOcrText(rawText);
  const text = normalized.replace(/\s+/g, ' ');
  const tableHasPer100Column = /per\s*100\s*(?:g|ml|m)\b/.test(text);
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const confidence: ParsedNutritionResult['confidence'] = {
    calories: false,
    protein: false,
    carbs: false,
    fat: false,
    fiber: false,
    sugar: false,
    sodium: false,
    servingBase: false,
  };

  let servingBase = 100;
  let servingUnit: ParsedNutritionResult['servingUnit'] = /\bml\b/.test(text) ? 'ml' : 'g';
  const servingMatch =
    text.match(/per\s*(\d{1,4})\s*(g|ml|m)\s*serving\s*size\b/) ||
    text.match(/amount\s+per\s+(?:pack|serving)[\s\S]{0,80}?serving\s*size[^\d]*(\d{1,4})\s*(g|ml|m)\b/) ||
    text.match(/serving\s*size[^\d]*(\d{1,4})\s*(g|ml|m)\b/) ||
    text.match(/per\s*(\d{1,4})\s*(g|ml|m)\b/) ||
    text.match(/\((\d{1,4})\s*(g|ml|m)\)/);
  if (servingMatch) {
    servingBase = parseNumber(servingMatch[1]);
    servingUnit = servingMatch[2] === 'g' ? 'g' : 'ml';
    confidence.servingBase = true;
  }
  const servingColumnIndex = detectServingColumnIndex(lines, servingBase, servingUnit);

  const pickByLine = (
    aliases: RegExp[],
    field: keyof ParsedNutritionResult['confidence'],
    nutrient: keyof Omit<ParsedNutritionResult, 'confidence'>,
  ): number => {
    const numbers = numbersFromLine(lines, aliases);
    if (numbers) {
      confidence[field] = true;
      return repairTableRowValue(numbers, nutrient, servingBase, tableHasPer100Column, servingColumnIndex);
    }

    return 0;
  };

  const pickFallback = (
    aliases: string[],
    unit: 'g' | 'mg' | 'kcal',
    field: keyof ParsedNutritionResult['confidence'],
    nutrient: keyof Omit<ParsedNutritionResult, 'confidence'>,
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

  let calories =
    pickByLine([/\benergy\b/, /\bcalories\b/], 'calories', 'calories') ||
    pickFallback(['energy[^\\d]{0,30}', 'calories'], 'kcal', 'calories', 'calories');
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
  if (!sodium) {
    const salt = text.match(/salt[^\d-]{0,30}(\d+(?:\.\d+)?)\s*g\b/i);
    if (salt) {
      sodium = parseNumber(salt[1]) * 400;
      confidence.sodium = true;
    }
  }

  return { servingBase, servingUnit, calories, protein, carbs, fat, fiber, sugar, sodium, confidence };
}
