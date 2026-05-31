import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

const productSchema = z.object({
  name: z.string().min(1).max(200),
  servingBase: z.number().positive().default(100),
  servingUnit: z.enum(['g', 'ml']).default('g'),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).default(0),
  sugar: z.number().min(0).default(0),
  sodium: z.number().min(0).default(0),
  imageUrl: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const search = req.nextUrl.searchParams.get('q')?.trim();

    const products = await prisma.product.findMany({
      where: {
        userId: user.id,
        ...(search ? { name: { contains: search } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await requireUser();
    const data = productSchema.parse(body);
    const product = await prisma.product.create({ data: { ...data, userId: user.id } });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
