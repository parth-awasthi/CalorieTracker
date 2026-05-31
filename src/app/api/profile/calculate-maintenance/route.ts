import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { calculateMaintenanceCalories } from '@/lib/profile';

const schema = z.object({
  age: z.coerce.number().int().positive(),
  weight: z.coerce.number().positive(),
  heightCm: z.coerce.number().positive(),
  gender: z.enum(['male', 'female']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very', 'extreme']),
  targetCalories: z.coerce.number().positive().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = schema.parse(await req.json());
    const maintenanceCalories = calculateMaintenanceCalories({
      age: data.age,
      weight: data.weight,
      heightCm: data.heightCm,
      gender: data.gender,
      activityLevel: data.activityLevel,
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        age: data.age,
        weight: data.weight,
        heightCm: data.heightCm,
        gender: data.gender,
        activityLevel: data.activityLevel,
        maintenanceCalories,
        targetCalories: data.targetCalories ?? user.targetCalories ?? maintenanceCalories,
      },
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
    return NextResponse.json({ error: 'Failed to calculate maintenance calories' }, { status: 500 });
  }
}
