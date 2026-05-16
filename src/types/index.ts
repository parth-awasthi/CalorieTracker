import type { Product, MealEntry } from '@prisma/client';

export type { Product, MealEntry };

export type MealEntryWithProduct = MealEntry & { product: Product };
