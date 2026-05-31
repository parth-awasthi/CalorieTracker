'use client';

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/use-products';
import { useCreateMealEntry } from '@/hooks/use-meals';
import { MEAL_LABELS, MEAL_TYPES, calculateNutrients, type MealType } from '@/lib/nutrition';
import { cn, formatDate, formatNumber, toDateKey } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product } from '@/types';

export default function NewMealEntryPage() {
  return (
    <Suspense>
      <NewMealEntryForm />
    </Suspense>
  );
}

function NewMealEntryForm() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const logDate = useMemo(() => parseDateParam(dateParam), [dateParam]);
  const isToday = toDateKey(logDate) === toDateKey(new Date());
  const [search, setSearch] = useState('');
  const { data: products, isLoading } = useProducts(search);
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>('100');
  const [mealType, setMealType] = useState<MealType>(getDefaultMealType());

  const createMutation = useCreateMealEntry();

  const preview = useMemo(() => {
    if (!selected) return null;
    const q = parseFloat(quantity);
    if (!q || q <= 0) return null;
    return calculateNutrients(selected, q);
  }, [selected, quantity]);

  async function handleSave() {
    if (!selected) {
      toast.error('Pick a product first');
      return;
    }
    const q = parseFloat(quantity);
    if (!q || q <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    try {
      await createMutation.mutateAsync({
        productId: selected.id,
        date: logDate,
        mealType,
        quantityInGrams: q,
      });
      toast.success(`Added to ${MEAL_LABELS[mealType]} for ${formatDate(logDate)}`);
      setSelected(null);
      setQuantity('100');
    } catch (e: any) {
      toast.error(e.message || 'Failed to log');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Log a Meal</h1>
        <p className="text-sm text-muted-foreground">
          {isToday ? 'Quick entry for today.' : `Adding to ${formatDate(logDate)}.`}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Pick a product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search saved products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !products || products.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No products.{' '}
                <Link href="/products/new" className="text-primary underline">
                  Add one
                </Link>
                .
              </p>
            ) : (
              products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-accent',
                    selected?.id === p.id && 'border-primary bg-accent',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(p.calories, 0)} kcal · per {p.servingBase}{p.servingUnit}
                    </div>
                  </div>
                  {selected?.id === p.id && <Check className="ml-2 h-4 w-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Quantity & meal</CardTitle>
          {selected && (
            <CardDescription>
              {selected.name} · nutrition per {selected.servingBase}{selected.servingUnit}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity ({selected?.servingUnit ?? 'g'})</Label>
              <Input
                id="qty"
                type="number"
                inputMode="decimal"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal">Meal</Label>
              <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                <SelectTrigger id="meal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MEAL_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {preview && (
            <div className="rounded-md border bg-muted/50 p-3">
              <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                You'll log
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs sm:grid-cols-7">
                <Mini label="kcal" value={formatNumber(preview.calculatedCalories, 0)} />
                <Mini label="P" value={formatNumber(preview.calculatedProtein)} />
                <Mini label="C" value={formatNumber(preview.calculatedCarbs)} />
                <Mini label="F" value={formatNumber(preview.calculatedFat)} />
                <Mini label="Fib" value={formatNumber(preview.calculatedFiber)} />
                <Mini label="Sug" value={formatNumber(preview.calculatedSugar)} />
                <Mini label="Na" value={formatNumber(preview.calculatedSodium, 0)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button className="w-full" onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Log meal'}
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={isToday ? '/dashboard' : '/calendar'}>
                Back to {isToday ? 'dashboard' : 'history'}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background p-2">
      <div className="font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function getDefaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'BREAKFAST';
  if (h < 15) return 'LUNCH';
  if (h < 21) return 'DINNER';
  return 'SNACKS';
}

function parseDateParam(value: string | null): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
