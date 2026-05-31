import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  servingBase: z.number().positive().optional(),
  servingUnit: z.enum(['g', 'ml']).optional(),
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  imageUrl: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const product = await prisma.product.findFirst({ where: { id: params.id, userId: user.id } });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updateSchema.parse(body);
    const existing = await prisma.product.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const product = await prisma.product.update({ where: { id: params.id }, data });
    return NextResponse.json(product);
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
    const existing = await prisma.product.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    // Foreign key restriction from meal entries
    if (e?.code === 'P2003' || e?.code === 'P2014') {
      return NextResponse.json(
        { error: 'Cannot delete: this product has meal entries logged against it.' },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
