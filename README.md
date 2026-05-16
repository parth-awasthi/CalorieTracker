# Nutrition Tracker

A personal calorie and nutrition tracking web app. Upload a photo of a packaged-food nutrition label, extract the values via OCR, save the product, and log meals to track your daily intake.

Built with Next.js 14 (App Router), TypeScript, Tailwind, Shadcn UI, Prisma + SQLite, Tesseract.js, and React Query.

---

## Features

- 📷 **OCR upload** — snap or upload a nutrition label; values are extracted automatically
- ✏️ **Editable confirmation** — review and correct OCR output before saving
- 🍽️ **Meal logging** — pick product, enter grams, choose meal; nutrients are calculated proportionally
- 📊 **Dashboard** — daily totals (calories, protein, carbs, fat, fiber, sugar, sodium) + per-meal breakdown
- 📅 **Calendar history** — browse any past day
- 🌗 **Dark mode** + 📱 **mobile responsive** (bottom tab bar on phones)

---

## Quick start

Prerequisites: **Node.js 18.17+** (20+ recommended) and **npm**.

```bash
# 1. Install dependencies
npm install

# 2. Create the SQLite database from the Prisma schema
npx prisma migrate dev --name init

# 3. (Optional) Seed sample products and meal entries for today
npm run db:seed

# 4. Run the dev server
npm run dev
```

Open <http://localhost:5000>.

The SQLite database lives at `prisma/dev.db` (created on first migrate). Delete it any time to start fresh and re-run `prisma migrate dev`.

---

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Generate Prisma client + production build |
| `npm run start` | Run the production build |
| `npm run db:migrate` | Apply schema changes & regenerate the client |
| `npm run db:seed` | Reset & re-seed sample data |
| `npm run db:studio` | Open Prisma Studio (browse the DB in your browser) |

---

## Architecture overview

Single Next.js App Router project — frontend and API live together.

```
Browser (React + React Query)
        │
        ▼
Next.js API routes  ──►  Prisma  ──►  SQLite (./prisma/dev.db)
        │
        └──►  Tesseract.js + sharp  (OCR pipeline, server-side)
```

**Why these choices:**

- **Next.js API routes** instead of a separate Express server: simpler for a single-user app and identical deployment story.
- **SQLite + Prisma** for zero-config local dev. Schema is portable to Postgres for Vercel by changing the `provider`.
- **React Query** for all server state (caching + automatic invalidation), so we don't need Zustand.
- **Tesseract runs server-side** in `/api/ocr`. Running it client-side would add ~10MB to the bundle.

---

## Database schema

Two tables. See `prisma/schema.prisma`.

**Product** — your library of foods:
`id, name, servingBase, calories, protein, carbs, fat, fiber, sugar, sodium, imageUrl, createdAt, updatedAt`

**MealEntry** — one logged consumption:
`id, date, mealType, quantityInGrams, calculatedCalories..calculatedSodium, productId, createdAt`

Nutrients on `MealEntry` are **pre-calculated and stored** rather than computed on read. This means if you later edit a product's nutrition values, historical entries stay true to what was logged at the time — the same approach apps like MyFitnessPal use.

---

## OCR approach

`src/lib/ocr.ts` runs three steps:

1. **Preprocess** with `sharp` — resize to 1600px max, grayscale, normalize contrast, sharpen. This significantly improves Tesseract accuracy on phone photos.
2. **OCR** with Tesseract.js (English) — returns raw text.
3. **Pattern parse** — for each nutrient, search the text for keyword aliases and grab the nearest number with the correct unit. Handles:
   - `calories` / `energy` / `kcal` (and kJ → kcal conversion)
   - `protein`, `total carbohydrate` / `carbs`, `total fat` / `fat`
   - `dietary fiber` / `fibre`, `total sugars` / `sugar`
   - `sodium` in mg, in g (converted), or derived from `salt × 400`
   - `per 100g`, `serving size 32g`, `(100g)` — auto-detects the serving base

OCR is never 100% accurate, so values pre-fill an editable form and the user confirms before saving.

---

## Folder structure

```
src/
├── app/
│   ├── layout.tsx, page.tsx           Root layout + Dashboard
│   ├── products/
│   │   ├── page.tsx                   Product Library
│   │   ├── new/page.tsx               Add Product (OCR flow)
│   │   └── [id]/edit/page.tsx         Edit Product
│   ├── meals/new/page.tsx             Log a meal
│   ├── calendar/page.tsx              Calendar history
│   └── api/
│       ├── products/route.ts          GET, POST
│       ├── products/[id]/route.ts     GET, PATCH, DELETE
│       ├── meals/route.ts             GET (by date), POST
│       ├── meals/[id]/route.ts        DELETE
│       ├── ocr/route.ts               OCR endpoint
│       └── upload/route.ts            Image upload
├── components/
│   ├── ui/                            Shadcn primitives
│   ├── dashboard/, products/, meals/, shared/
├── lib/
│   ├── prisma.ts                      Prisma singleton
│   ├── ocr.ts                         Tesseract + parser
│   ├── nutrition.ts                   Calculation helpers
│   ├── query-client.tsx               React Query provider
│   └── utils.ts
├── hooks/
│   ├── use-products.ts
│   └── use-meals.ts
└── types/index.ts

prisma/
├── schema.prisma
└── seed.ts

public/uploads/    (label images saved here in local dev)
```

---

## Deploying to Vercel later

The app is structured to deploy cleanly. Two changes needed:

**1. Swap SQLite for Postgres.** In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then set `DATABASE_URL` in Vercel env vars to a hosted Postgres URL (Vercel Postgres, Neon, Supabase). Run `npx prisma migrate deploy` as part of the build.

**2. Swap local file uploads for blob storage.** Vercel's filesystem is read-only at runtime. Replace `src/app/api/upload/route.ts` with `@vercel/blob`:

```ts
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('image') as File;
  const blob = await put(file.name, file, { access: 'public' });
  return NextResponse.json({ url: blob.url });
}
```

Everything else — the API contracts, components, OCR — works as-is.

---

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Lucide icons
- **State:** React Query (TanStack Query v5)
- **Forms:** react-hook-form + Zod
- **Backend:** Next.js API routes (Node runtime)
- **Database:** SQLite + Prisma
- **OCR:** Tesseract.js + sharp (image preprocessing)
- **Theme:** next-themes (light/dark/system)
- **Toasts:** Sonner
- **Date picker:** react-day-picker

---

## Notes & gotchas

- The first OCR request on a fresh install can take ~10–20s because Tesseract downloads its language data. Subsequent requests are much faster.
- For best OCR results: well-lit, flat, in-focus photos. Crop close to the nutrition table when you can.
- The Prisma client is generated automatically via the `postinstall` script — no extra step needed after `npm install`.
- If you see "Prisma client is out of sync" after editing the schema, run `npm run db:migrate`.
