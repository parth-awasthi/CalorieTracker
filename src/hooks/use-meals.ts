'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MealEntryWithProduct } from '@/types';
import type { MealType } from '@/lib/nutrition';
import { toDateKey } from '@/lib/utils';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useMealsForDate(date: Date) {
  const key = toDateKey(date);
  return useQuery<MealEntryWithProduct[]>({
    queryKey: ['meals', key],
    queryFn: () => fetchJson(`/api/meals?date=${key}`),
  });
}

export function useCreateMealEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      productId: string;
      date: Date;
      mealType: MealType;
      quantityInGrams: number;
    }) =>
      fetchJson<MealEntryWithProduct>('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: data.productId,
          date: toDateKey(data.date),
          mealType: data.mealType,
          quantityInGrams: data.quantityInGrams,
        }),
      }),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['meals', toDateKey(variables.date)] });
    },
  });
}

export function useDeleteMealEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/meals/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });
}
