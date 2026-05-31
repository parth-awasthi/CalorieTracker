'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { activityLevels } from '@/lib/profile';

type Profile = {
  name: string;
  email: string | null;
  age: number | null;
  weight: number | null;
  heightCm: number | null;
  gender: 'male' | 'female' | null;
  activityLevel: string | null;
  maintenanceCalories: number | null;
  targetCalories: number | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then(setProfile)
      .catch(() => toast.error('Failed to load profile'));
  }, []);

  const formValue = useMemo(() => profile, [profile]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get('name'),
      age: formData.get('age') || null,
      weight: formData.get('weight') || null,
      heightCm: formData.get('heightCm') || null,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
      maintenanceCalories: formData.get('maintenanceCalories') || null,
      targetCalories: formData.get('targetCalories') || null,
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      setProfile(data);
      queryClient.setQueryData(['profile'], data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }

  async function calculateCalories() {
    if (!profile?.gender || !profile.activityLevel) {
      toast.error('Choose gender and activity level first.');
      return;
    }
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const age = formData.get('age');
    const weight = formData.get('weight');
    const heightCm = formData.get('heightCm');

    if (!age || !weight || !heightCm) {
      toast.error('Add age, weight, and height before calculating maintenance calories.');
      return;
    }

    setIsCalculating(true);
    try {
      const res = await fetch('/api/profile/calculate-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age,
          weight,
          heightCm,
          gender: profile.gender,
          activityLevel: profile.activityLevel,
          targetCalories: formData.get('targetCalories') || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to calculate calories');
      setProfile(data);
      queryClient.setQueryData(['profile'], data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Maintenance calories calculated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to calculate calories');
    } finally {
      setIsCalculating(false);
    }
  }

  if (!formValue) return <p className="text-sm text-muted-foreground">Loading profile...</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage account details and calorie goals.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Email is verified and cannot be edited here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} className="space-y-4" onSubmit={saveProfile}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Name" defaultValue={formValue.name} />
              <Field name="email" label="Email address" defaultValue={formValue.email ?? ''} disabled />
              <Field name="age" label="Age" type="number" defaultValue={formValue.age ?? ''} />
              <Field name="weight" label="Weight (kg)" type="number" step="any" defaultValue={formValue.weight ?? ''} />
              <Field
                name="heightCm"
                label="Height (cm)"
                type="number"
                step="any"
                defaultValue={formValue.heightCm ?? ''}
              />
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formValue.gender ?? ''}
                  onValueChange={(value) =>
                    setProfile((current) =>
                      current ? { ...current, gender: value as Profile['gender'] } : current,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Activity level</Label>
                <Select
                  value={formValue.activityLevel ?? ''}
                  onValueChange={(value) =>
                    setProfile((current) =>
                      current ? { ...current, activityLevel: value } : current,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                name="maintenanceCalories"
                label="Maintenance calories"
                type="number"
                defaultValue={formValue.maintenanceCalories ?? ''}
              />
              <Field
                name="targetCalories"
                label="Target calories"
                type="number"
                defaultValue={formValue.targetCalories ?? ''}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={calculateCalories} disabled={isCalculating}>
                {isCalculating ? 'Calculating...' : 'Calculate Maintenance Calories'}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  step,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  defaultValue?: string | number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        key={`${name}-${defaultValue ?? ''}`}
        id={name}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        disabled={disabled}
        required={!disabled}
      />
    </div>
  );
}
