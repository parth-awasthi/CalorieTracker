'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Product } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  servingBase: z.coerce.number().positive(),
  servingUnit: z.enum(['g', 'ml']),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  fat: z.coerce.number().min(0),
  fiber: z.coerce.number().min(0),
  sugar: z.coerce.number().min(0),
  sodium: z.coerce.number().min(0),
});

export type ProductFormValues = z.infer<typeof schema>;

export function ProductForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save Product',
  isSubmitting = false,
}: {
  defaultValues?: Partial<Product>;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
}) {
  const defaultServingUnit: ProductFormValues['servingUnit'] =
    defaultValues?.servingUnit === 'ml' ? 'ml' : 'g';
  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      servingBase: defaultValues?.servingBase ?? 100,
      servingUnit: defaultServingUnit,
      calories: defaultValues?.calories ?? 0,
      protein: defaultValues?.protein ?? 0,
      carbs: defaultValues?.carbs ?? 0,
      fat: defaultValues?.fat ?? 0,
      fiber: defaultValues?.fiber ?? 0,
      sugar: defaultValues?.sugar ?? 0,
      sodium: defaultValues?.sodium ?? 0,
    },
  });
  const servingUnit = watch('servingUnit');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Product Name</Label>
        <Input id="name" placeholder="e.g. Peanut Butter" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="servingBase">Nutrition values are per</Label>
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <Input id="servingBase" type="number" step="any" {...register('servingBase')} />
          <input type="hidden" {...register('servingUnit')} />
          <Select
            value={servingUnit}
            onValueChange={(value) => setValue('servingUnit', value as ProductFormValues['servingUnit'])}
          >
            <SelectTrigger aria-label="Serving unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="g">grams</SelectItem>
              <SelectItem value="ml">ml</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Use grams for solid foods and ml for liquids. Nutrients stay in g, sodium stays in mg.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Calories (kcal)" id="calories" register={register} error={errors.calories?.message} />
        <Field label="Protein (g)" id="protein" register={register} error={errors.protein?.message} />
        <Field label="Carbs (g)" id="carbs" register={register} error={errors.carbs?.message} />
        <Field label="Fat (g)" id="fat" register={register} error={errors.fat?.message} />
        <Field label="Fiber (g)" id="fiber" register={register} error={errors.fiber?.message} />
        <Field label="Sugar (g)" id="sugar" register={register} error={errors.sugar?.message} />
        <Field label="Sodium (mg)" id="sodium" register={register} error={errors.sodium?.message} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

function Field({
  label,
  id,
  register,
  error,
}: {
  label: string;
  id: keyof ProductFormValues;
  register: ReturnType<typeof useForm<ProductFormValues>>['register'];
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} type="number" step="any" {...register(id)} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
