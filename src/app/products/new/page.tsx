'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OcrUpload } from '@/components/products/ocr-upload';
import { ProductForm, type ProductFormValues } from '@/components/products/product-form';
import { useCreateProduct } from '@/hooks/use-products';
import { toast } from 'sonner';
import type { OcrNutritionResult } from '@/lib/ocr';

export default function NewProductPage() {
  const router = useRouter();
  const createMutation = useCreateProduct();
  const [extracted, setExtracted] = useState<(OcrNutritionResult & { imageUrl?: string }) | null>(null);

  async function handleSave(values: ProductFormValues) {
    try {
      await createMutation.mutateAsync({ ...values, imageUrl: extracted?.imageUrl ?? null });
      toast.success('Product saved');
      router.push('/products');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Add Product</h1>
        <p className="text-sm text-muted-foreground">
          Upload a nutrition label and we'll extract the values automatically. You can correct
          anything before saving.
        </p>
      </header>

      <OcrUpload onExtracted={setExtracted} />

      <Card>
        <CardHeader>
          <CardTitle>Nutrition Details</CardTitle>
          <CardDescription>
            {extracted
              ? 'Values pre-filled from the label. Verify before saving.'
              : 'Or enter values manually.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            key={extracted ? 'ocr' : 'manual'}
            defaultValues={
              extracted
                ? {
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
                : undefined
            }
            onSubmit={handleSave}
            isSubmitting={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
