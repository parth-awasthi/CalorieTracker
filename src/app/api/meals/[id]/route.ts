import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { calculateNutrients, MEAL_TYPES } from '@/lib/nutrition';

const updateSchema = z.object({
  productId: z.string(),
  mealType: z.enum(MEAL_TYPES),
  quantityInGrams: z.number().positive(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const data = updateSchema.parse(await req.json());

    const existing = await prisma.mealEntry.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const product = await prisma.product.findFirst({
      where: { id: data.productId, userId: user.id },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const nutrients = calculateNutrients(product, data.quantityInGrams);
    const entry = await prisma.mealEntry.update({
      where: { id: params.id },
      data: {
        productId: data.productId,
        mealType: data.mealType,
        ...nutrients,
      },
      include: { product: true },
    });

    return NextResponse.json(entry);
  } catch (e) {
    if (e instanceof Response) return e;
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.mealEntry.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.mealEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
