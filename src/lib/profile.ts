export const activityLevels = [
  { value: 'sedentary', label: 'Sedentary: little or no exercise', multiplier: 1.2 },
  { value: 'light', label: 'Light: exercise 1-3 times/week', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderate: exercise 4-5 times/week', multiplier: 1.465 },
  {
    value: 'active',
    label: 'Active: daily exercise or intense exercise 3-4 times/week',
    multiplier: 1.55,
  },
  { value: 'very', label: 'Very Active: intense exercise 6-7 times/week', multiplier: 1.725 },
  {
    value: 'extreme',
    label: 'Extra Active: very intense exercise daily or physical job',
    multiplier: 1.9,
  },
] as const;

export type ActivityLevel = (typeof activityLevels)[number]['value'];
export type Gender = 'male' | 'female';

export function getActivityMultiplier(activityLevel?: string | null) {
  return activityLevels.find((level) => level.value === activityLevel)?.multiplier ?? 1.2;
}

export function calculateMaintenanceCalories({
  weight,
  heightCm,
  age,
  gender,
  activityLevel,
}: {
  weight: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: string;
}) {
  const bmr =
    10 * weight + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);
  return Math.round(bmr * getActivityMultiplier(activityLevel));
}
