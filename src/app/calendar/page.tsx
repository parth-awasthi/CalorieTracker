'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { NutrientStats } from '@/components/dashboard/nutrient-stats';
import { MealSection } from '@/components/dashboard/meal-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useMealsForDate } from '@/hooks/use-meals';
import { EMPTY_TOTALS, MEAL_TYPES, sumMealEntries, type MealType } from '@/lib/nutrition';
import { formatDate } from '@/lib/utils';

export default function CalendarPage() {
  const [date, setDate] = useState<Date>(new Date());
  const { data: entries, isLoading } = useMealsForDate(date);

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
      <header>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">Review your past intake.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick a date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) => d > new Date()}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">{formatDate(date)}</h2>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-[88px]" />
                ))}
              </div>
            ) : (
              <NutrientStats totals={totals} />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {MEAL_TYPES.map((t) => (
              <MealSection key={t} mealType={t} entries={grouped[t] ?? []} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
