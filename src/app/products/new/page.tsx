'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OcrUpload } from '@/components/products/ocr-upload';
import { BarcodeScanner } from '@/components/products/barcode-scanner';
import { ProductForm, type ProductFormValues } from '@/components/products/product-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateProduct } from '@/hooks/use-products';
import { toast } from 'sonner';

type ExtractedProduct = Omit<ProductFormValues, 'name'> & {
  name?: string;
  imageUrl?: string | null;
  source?: 'barcode' | 'label';
};

export default function NewProductPage() {
  const router = useRouter();
  const createMutation = useCreateProduct();
  const [extracted, setExtracted] = useState<ExtractedProduct | null>(null);

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
          Scan a barcode for known products, scan a nutrition label, or enter values manually.
        </p>
      </header>

      <Tabs defaultValue="barcode" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="barcode">Barcode</TabsTrigger>
          <TabsTrigger value="label">Nutrition label</TabsTrigger>
        </TabsList>
        <TabsContent value="barcode">
          <BarcodeScanner onFound={(data) => setExtracted({ ...data, source: 'barcode' })} />
        </TabsContent>
        <TabsContent value="label">
          <OcrUpload onExtracted={(data) => setExtracted({ ...data, source: 'label' })} />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Nutrition Details</CardTitle>
          <CardDescription>
            {extracted
              ? extracted.source === 'barcode'
                ? 'Values pre-filled from Open Food Facts. Verify before saving.'
                : 'Values pre-filled from the label. Verify before saving.'
              : 'Or enter values manually.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {extracted?.source === 'barcode' && (
            <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
              Barcode data comes from Open Food Facts and may be user-submitted. Verify sodium,
              serving size, and any unusual values before saving.
            </p>
          )}
          <ProductForm
            key={extracted ? `${extracted.source ?? 'extracted'}-${extracted.name ?? ''}` : 'manual'}
            defaultValues={
              extracted
                ? {
                    name: extracted.name,
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
