'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  Barcode,
  CalendarDays,
  Camera,
  CheckCircle2,
  Flame,
  LineChart,
  ScanText,
  ShieldCheck,
  Sparkles,
  Target,
  Utensils,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Camera,
    title: 'Scan labels',
    text: 'Capture nutrition labels and pre-fill calories, macros, sugar, fiber, and sodium for review.',
  },
  {
    icon: Barcode,
    title: 'Use barcodes',
    text: 'Scan a product barcode from your camera and pull product nutrition details when available.',
  },
  {
    icon: Target,
    title: 'Hit your goal',
    text: 'Set target calories, calculate maintenance, and see your daily progress update as you log meals.',
  },
  {
    icon: CalendarDays,
    title: 'Review history',
    text: 'Look back at logged meals and daily totals with a clean calendar view.',
  },
];

const steps = ['Create your profile', 'Add products by scan or search', 'Log meals in seconds', 'Track daily progress'];

export default function LandingPage() {
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="-mx-4 -my-6 overflow-hidden md:-mx-6">
      <section className="relative min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.22),_transparent_34%),linear-gradient(135deg,_#07111f_0%,_#071827_48%,_#101418_100%)] px-4 py-10 text-white md:px-6 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-emerald-100 backdrop-blur">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Calorie tracking built around real food labels
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
                Track calories, macros, and meals without fighting spreadsheets.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-200">
                Nutrition Tracker helps you scan labels, save products, log meals, and compare today&apos;s intake against your personal calorie target.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                <Link href={isLoggedIn ? '/dashboard' : '/signup'}>
                  {isLoggedIn ? 'Open dashboard' : 'Get started'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href={isLoggedIn ? '/products/new' : '/login'}>
                  {isLoggedIn ? 'Scan a product' : 'Log in'}
                </Link>
              </Button>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              {steps.map((step) => (
                <div key={step} className="flex items-center gap-2 text-sm text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[520px] lg:min-h-[620px]" aria-hidden="true">
            <div className="absolute left-0 top-8 w-[86%] rounded-[2rem] border border-white/15 bg-slate-950/80 p-4 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Today&apos;s Intake</p>
                  <p className="text-2xl font-bold">1,850 / 2,200 kcal</p>
                </div>
                <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-200">84%</div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-[84%] rounded-full bg-emerald-400" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ['Protein', '118g'],
                  ['Carbs', '205g'],
                  ['Fat', '54g'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="mt-1 text-xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Breakfast', 'Oats, milk, banana', '482 kcal'],
                  ['Lunch', 'Paneer wrap', '690 kcal'],
                  ['Snack', 'Whey shake', '210 kcal'],
                ].map(([meal, items, calories]) => (
                  <div key={meal} className="flex items-center justify-between rounded-xl bg-slate-900 p-3">
                    <div>
                      <p className="font-semibold">{meal}</p>
                      <p className="text-sm text-slate-400">{items}</p>
                    </div>
                    <p className="font-semibold text-emerald-200">{calories}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-8 right-0 w-[64%] rounded-[1.6rem] border border-emerald-300/20 bg-white p-4 text-slate-950 shadow-2xl shadow-black/25">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-full bg-emerald-100 p-2">
                  <ScanText className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-bold">Label detected</p>
                  <p className="text-xs text-slate-500">Values ready to review</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Calories', '364'],
                  ['Protein', '26g'],
                  ['Carbs', '57.3g'],
                  ['Sodium', '130.4mg'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-100 p-2">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute right-8 top-0 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <Barcode className="h-8 w-8 text-emerald-300" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background px-4 py-16 md:px-6">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">What it does</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              One place for products, meals, goals, and history.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-lg border bg-card p-5 shadow-sm">
                <Icon className="h-7 w-7 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/35 px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <div className="flex gap-4">
            <Flame className="mt-1 h-8 w-8 text-primary" />
            <div>
              <h3 className="text-xl font-bold">Daily clarity</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Consumed calories, remaining calories, and overflow warnings are visible at a glance.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <LineChart className="mt-1 h-8 w-8 text-primary" />
            <div>
              <h3 className="text-xl font-bold">Personal goals</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Calculate maintenance calories, set a target, and adjust it whenever your plan changes.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <ShieldCheck className="mt-1 h-8 w-8 text-primary" />
            <div>
              <h3 className="text-xl font-bold">Private by account</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Your products, meals, and history stay scoped to your own Google login.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background px-4 py-16 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <Utensils className="h-10 w-10 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to log your next meal?</h2>
          <p className="max-w-2xl text-muted-foreground">
            Start with Google sign-in, set your profile once, and build a product library that gets faster every time you use it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={isLoggedIn ? '/dashboard' : '/signup'}>
                {isLoggedIn ? 'Go to dashboard' : 'Create account'}
              </Link>
            </Button>
            {!isLoggedIn && (
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
