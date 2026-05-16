'use client';

import { Coffee, Sun, Moon, Cookie, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';
import { MEAL_LABELS, type MealType, sumMealEntries } from '@/lib/nutrition';
import type { MealEntryWithProduct } from '@/types';
import { useDeleteMealEntry } from '@/hooks/use-meals';
import { toast } from 'sonner';

const MEAL_ICONS: Record<MealType, React.ComponentType<{ className?: string }>> = {
  BREAKFAST: Coffee,
  LUNCH: Sun,
  DINNER: Moon,
  SNACKS: Cookie,
};

export function MealSection({
  mealType,
  entries,
  readOnly = false,
}: {
  mealType: MealType;
  entries: MealEntryWithProduct[];
  readOnly?: boolean;
}) {
  const Icon = MEAL_ICONS[mealType];
  const totals = sumMealEntries(entries);
  const deleteMutation = useDeleteMealEntry();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {MEAL_LABELS[mealType]}
        </CardTitle>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums">
            {formatNumber(totals.calories, 0)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">kcal</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No items logged.</p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{entry.product.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatNumber(entry.quantityInGrams, 0)} {entry.product.servingUnit} · P{' '}
                  {formatNumber(entry.calculatedProtein)} · C{' '}
                  {formatNumber(entry.calculatedCarbs)} · F{' '}
                  {formatNumber(entry.calculatedFat)}
                </div>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {formatNumber(entry.calculatedCalories, 0)} kcal
                </span>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      deleteMutation.mutate(entry.id, {
                        onSuccess: () => toast.success('Entry removed'),
                        onError: (e) => toast.error(e.message),
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
