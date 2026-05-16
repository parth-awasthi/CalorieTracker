import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculateNutrients, MEAL_TYPES } from '@/lib/nutrition';

const createSchema = z.object({
  productId: z.string(),
  date: z.string(),                     // ISO date or YYYY-MM-DD
  mealType: z.enum(MEAL_TYPES),
  quantityInGrams: z.number().positive(),
});

function parseDateKey(s: string): Date {
  // Accept YYYY-MM-DD or ISO. Always return midnight local time → stored as UTC instant.
  const [datePart] = s.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get('date');
  if (!dateParam) {
    return NextResponse.json({ error: 'date query param required' }, { status: 400 });
  }
  const start = parseDateKey(dateParam);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const entries = await prisma.mealEntry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const nutrients = calculateNutrients(product, data.quantityInGrams);

    const entry = await prisma.mealEntry.create({
      data: {
        date: parseDateKey(data.date),
        mealType: data.mealType,
        productId: data.productId,
        ...nutrients,
      },
      include: { product: true },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
