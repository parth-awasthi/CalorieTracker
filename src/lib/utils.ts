import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 1): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return '0';
  if (n === 0) return '0';
  if (Math.abs(n) < 0.1) return n.toFixed(2);
  return n.toFixed(decimals);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function toDateKey(d: Date): string {
  // YYYY-MM-DD in local time
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dayBoundsUTC(localDate: Date): { start: Date; end: Date } {
  // Take a local date and return the UTC start/end of that calendar day
  const start = new Date(localDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
