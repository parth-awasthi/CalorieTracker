'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductForm, type ProductFormValues } from '@/components/products/product-form';
import { OcrUpload } from '@/components/products/ocr-upload';
import { useProduct, useUpdateProduct } from '@/hooks/use-products';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { OcrNutritionResult } from '@/lib/ocr';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useProduct(id);
  const updateMutation = useUpdateProduct(id);
  const [extracted, setExtracted] = useState<(OcrNutritionResult & { imageUrl?: string }) | null>(null);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (!product) {
    return <p className="text-sm text-muted-foreground">Product not found.</p>;
  }

  async function handleSave(values: ProductFormValues) {
    try {
      await updateMutation.mutateAsync({
        ...values,
        imageUrl: extracted?.imageUrl ?? product?.imageUrl ?? null,
      });
      toast.success('Product updated');
      router.push('/products');
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    }
  }

  // Merge OCR override on top of existing product values when extracted
  const formDefaults = extracted
    ? {
        ...product,
        servingBase: extracted.servingBase,
        servingUnit: extracted.servingUnit,
        calories: extracted.calories,
        protein: extracted.protein,
        carbs: extracted.carbs,
        fat: extracted.fat,
        fiber: extracted.fiber,
        sugar: extracted.sugar,
        sodium: extracted.sodium,
      }
    : product;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-sm text-muted-foreground">
          Update the nutrition info, or re-upload a clearer label image.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Re-upload label (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <OcrUpload onExtracted={setExtracted} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nutrition Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            key={extracted ? 'ocr-edit' : 'edit'}
            defaultValues={formDefaults}
            onSubmit={handleSave}
            submitLabel="Update Product"
            isSubmitting={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
