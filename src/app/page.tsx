'use client';

import Link from 'next/link';
import { Plus, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NutrientStats } from '@/components/dashboard/nutrient-stats';
import { MealSection } from '@/components/dashboard/meal-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useMealsForDate } from '@/hooks/use-meals';
import { EMPTY_TOTALS, MEAL_TYPES, sumMealEntries, type MealType } from '@/lib/nutrition';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const today = new Date();
  const { data: entries, isLoading } = useMealsForDate(today);

  const totals = entries ? sumMealEntries(entries) : EMPTY_TOTALS;

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
        <NutrientStats totals={totals} />
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
