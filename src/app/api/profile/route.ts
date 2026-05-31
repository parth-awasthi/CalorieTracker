import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.coerce.number().int().positive().nullable().optional(),
  weight: z.coerce.number().positive().nullable().optional(),
  heightCm: z.coerce.number().positive().nullable().optional(),
  gender: z.enum(['male', 'female']).nullable().optional(),
  activityLevel: z
    .enum(['sedentary', 'light', 'moderate', 'active', 'very', 'extreme'])
    .nullable()
    .optional(),
  maintenanceCalories: z.coerce.number().positive().nullable().optional(),
  targetCalories: z.coerce.number().positive().nullable().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const data = profileSchema.parse(await req.json());
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        age: true,
        weight: true,
        heightCm: true,
        gender: true,
        activityLevel: true,
        maintenanceCalories: true,
        targetCalories: true,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Profile update failed' }, { status: 500 });
  }
}
