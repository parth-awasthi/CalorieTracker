'use client';

import Link from 'next/link';
import { Plus, Utensils } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NutrientStats } from '@/components/dashboard/nutrient-stats';
import { MealSection } from '@/components/dashboard/meal-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useMealsForDate } from '@/hooks/use-meals';
import { EMPTY_TOTALS, MEAL_TYPES, sumMealEntries, type MealType } from '@/lib/nutrition';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const today = new Date();
  const { data: entries, isLoading } = useMealsForDate(today);
  const { data: profile } = useQuery<{
    targetCalories: number | null;
  }>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error('Failed to load profile');
      return res.json();
    },
  });

  const totals = entries ? sumMealEntries(entries) : EMPTY_TOTALS;
  const targetCalories = profile?.targetCalories ?? 0;

  const grouped = MEAL_TYPES.reduce<Record<MealType, typeof entries>>(
    (acc, t) => {
      acc[t] = (entries ?? []).filter((e) => e.mealType === t);
      return acc;
    },
    { BREAKFAST: [], LUNCH: [], DINNER: [], SNACKS: [] } as any,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{formatDate(today)}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Today's Intake</h1>
        </div>
        <Button asChild>
          <Link href="/meals/new">
            <Utensils className="mr-2 h-4 w-4" />
            Log a meal
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      ) : (
        <>
          <CalorieTargetCard consumed={totals.calories} target={targetCalories} />
          <NutrientStats totals={totals} />
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {MEAL_TYPES.map((t) => (
          <MealSection key={t} mealType={t} entries={grouped[t] ?? []} />
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Button variant="outline" asChild>
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add a new product
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CalorieTargetCard({ consumed, target }: { consumed: number; target: number }) {
  const hasTarget = target > 0;
  const percentage = hasTarget ? Math.round((consumed / target) * 100) : 0;
  const barWidth = Math.min(percentage, 100);
  const difference = Math.round(Math.abs(target - consumed));
  const isOver = hasTarget && consumed > target;

  return (
    <Card className={isOver ? 'border-destructive/60' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Daily Calorie Target</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasTarget ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-3xl font-bold">
                  {Math.round(consumed)} / {Math.round(target)} kcal
                </p>
                <p className={isOver ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
                  {isOver ? `${difference} kcal over target` : `${difference} kcal remaining`}
                </p>
              </div>
              <p className={isOver ? 'text-sm font-semibold text-destructive' : 'text-sm font-semibold'}>
                {percentage}% completed
              </p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={isOver ? 'h-full bg-destructive' : 'h-full bg-primary'}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Set a target calorie goal in your profile to track daily progress.
            </p>
            <Button asChild variant="outline">
              <Link href="/profile">Set Target</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
