'use client';

import { useState } from 'react';
import { Check, Coffee, Cookie, Moon, Pencil, Sun, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';
import { MEAL_LABELS, type MealType, sumMealEntries } from '@/lib/nutrition';
import type { MealEntryWithProduct } from '@/types';
import { useDeleteMealEntry, useUpdateMealEntry } from '@/hooks/use-meals';
import { useProducts } from '@/hooks/use-products';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

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
  canEdit = false,
}: {
  mealType: MealType;
  entries: MealEntryWithProduct[];
  readOnly?: boolean;
  canEdit?: boolean;
}) {
  const Icon = MEAL_ICONS[mealType];
  const totals = sumMealEntries(entries);
  const deleteMutation = useDeleteMealEntry();
  const updateMutation = useUpdateMealEntry();
  const { data: products = [] } = useProducts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<{
    productId: string;
    mealType: MealType;
    quantityInGrams: string;
  } | null>(null);

  function startEdit(entry: MealEntryWithProduct) {
    setEditingId(entry.id);
    setEditValue({
      productId: entry.productId,
      mealType: entry.mealType as MealType,
      quantityInGrams: String(entry.quantityInGrams),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue(null);
  }

  function saveEdit(entry: MealEntryWithProduct) {
    if (!editValue) return;
    const quantity = Number(editValue.quantityInGrams);
    if (!editValue.productId || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Choose a product and enter a valid quantity.');
      return;
    }

    updateMutation.mutate(
      {
        id: entry.id,
        productId: editValue.productId,
        mealType: editValue.mealType,
        quantityInGrams: quantity,
      },
      {
        onSuccess: () => {
          cancelEdit();
          toast.success('Meal entry updated');
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

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
              className="rounded-md border p-3"
            >
              {editingId === entry.id && editValue ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr,120px]">
                    <Select
                      value={editValue.productId}
                      onValueChange={(productId) => setEditValue((current) => current && { ...current, productId })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={editValue.quantityInGrams}
                      onChange={(event) =>
                        setEditValue((current) =>
                          current ? { ...current, quantityInGrams: event.target.value } : current,
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Select
                      value={editValue.mealType}
                      onValueChange={(value) =>
                        setEditValue((current) =>
                          current ? { ...current, mealType: value as MealType } : current,
                        )
                      }
                    >
                      <SelectTrigger className="sm:w-[180px]">
                        <SelectValue placeholder="Meal type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MEAL_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveEdit(entry)}
                        disabled={updateMutation.isPending}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
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
                    {canEdit && !readOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => startEdit(entry)}
                        aria-label="Edit meal entry"
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
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
                        aria-label="Delete meal entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
