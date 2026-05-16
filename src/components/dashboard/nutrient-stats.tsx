'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Flame, Beef, Wheat, Droplet, Leaf, Candy, Waves } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { NutrientTotals } from '@/lib/nutrition';

const items: Array<{
  key: keyof NutrientTotals;
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = [
  { key: 'calories', label: 'Calories', unit: 'kcal', icon: Flame, accent: 'text-orange-500' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    icon: Beef,  accent: 'text-rose-500' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    icon: Wheat, accent: 'text-amber-500' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    icon: Droplet, accent: 'text-yellow-500' },
  { key: 'fiber',    label: 'Fiber',    unit: 'g',    icon: Leaf,  accent: 'text-emerald-500' },
  { key: 'sugar',    label: 'Sugar',    unit: 'g',    icon: Candy, accent: 'text-pink-500' },
  { key: 'sodium',   label: 'Sodium',   unit: 'mg',   icon: Waves, accent: 'text-sky-500' },
];

export function NutrientStats({ totals }: { totals: NutrientTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {items.map(({ key, label, unit, icon: Icon, accent }) => (
        <Card key={key} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <Icon className={`h-4 w-4 ${accent}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">
                {formatNumber(totals[key], key === 'calories' || key === 'sodium' ? 0 : 1)}
              </span>
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
