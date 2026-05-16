'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/types';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useProducts(search?: string) {
  return useQuery<Product[]>({
    queryKey: ['products', search ?? ''],
    queryFn: () => fetchJson(`/api/products${search ? `?q=${encodeURIComponent(search)}` : ''}`),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery<Product>({
    queryKey: ['products', 'detail', id],
    queryFn: () => fetchJson(`/api/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      fetchJson<Product>('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      fetchJson<Product>(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
