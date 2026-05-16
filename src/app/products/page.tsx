'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts, useDeleteProduct } from '@/hooks/use-products';
import { formatNumber } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const { data: products, isLoading } = useProducts(search);
  const deleteMutation = useDeleteProduct();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Library</h1>
          <p className="text-sm text-muted-foreground">All saved foods you can log.</p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add product
          </Link>
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !products || products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">No products found.</p>
            <Button asChild>
              <Link href="/products/new">Add your first product</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-semibold leading-tight">{p.name}</h3>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/products/${p.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (!confirm(`Delete "${p.name}"?`)) return;
                        deleteMutation.mutate(p.id, {
                          onSuccess: () => toast.success('Deleted'),
                          onError: (e) => toast.error(e.message),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Per {p.servingBase}{p.servingUnit}
                </p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <Stat label="kcal" value={formatNumber(p.calories, 0)} />
                  <Stat label="P" value={formatNumber(p.protein)} />
                  <Stat label="C" value={formatNumber(p.carbs)} />
                  <Stat label="F" value={formatNumber(p.fat)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <div className="font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
