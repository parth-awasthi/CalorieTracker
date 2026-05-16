import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.mealEntry.deleteMany();
  await prisma.product.deleteMany();

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Peanut Butter (Natural)',
        servingBase: 100,
        calories: 588,
        protein: 25,
        carbs: 20,
        fat: 50,
        fiber: 6,
        sugar: 9,
        sodium: 17,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Rolled Oats',
        servingBase: 100,
        calories: 379,
        protein: 13.2,
        carbs: 67.7,
        fat: 6.5,
        fiber: 10.1,
        sugar: 0.99,
        sodium: 6,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Greek Yogurt (Plain, Low Fat)',
        servingBase: 100,
        calories: 59,
        protein: 10,
        carbs: 3.6,
        fat: 0.4,
        fiber: 0,
        sugar: 3.2,
        sodium: 36,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Whole Wheat Bread',
        servingBase: 100,
        calories: 247,
        protein: 13,
        carbs: 41,
        fat: 3.4,
        fiber: 7,
        sugar: 6,
        sodium: 400,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Banana',
        servingBase: 100,
        calories: 89,
        protein: 1.1,
        carbs: 22.8,
        fat: 0.3,
        fiber: 2.6,
        sugar: 12.2,
        sodium: 1,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Chicken Breast (Cooked)',
        servingBase: 100,
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        fiber: 0,
        sugar: 0,
        sodium: 74,
      },
    }),
  ]);

  // Today's meal entries — sample log
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const peanutButter = products[0];
  const oats = products[1];
  const banana = products[4];

  const calc = (product: typeof peanutButter, grams: number) => {
    const factor = grams / product.servingBase;
    return {
      quantityInGrams: grams,
      calculatedCalories: product.calories * factor,
      calculatedProtein: product.protein * factor,
      calculatedCarbs: product.carbs * factor,
      calculatedFat: product.fat * factor,
      calculatedFiber: product.fiber * factor,
      calculatedSugar: product.sugar * factor,
      calculatedSodium: product.sodium * factor,
    };
  };

  await prisma.mealEntry.createMany({
    data: [
      {
        date: today,
        mealType: 'BREAKFAST',
        productId: oats.id,
        ...calc(oats, 60),
      },
      {
        date: today,
        mealType: 'BREAKFAST',
        productId: banana.id,
        ...calc(banana, 120),
      },
      {
        date: today,
        mealType: 'SNACKS',
        productId: peanutButter.id,
        ...calc(peanutButter, 32),
      },
    ],
  });

  console.log(`✅ Seeded ${products.length} products and 3 meal entries`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
