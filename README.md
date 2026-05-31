# Nutrition Tracker

A full-stack calorie and nutrition tracking web app for saving products, scanning nutrition labels and barcodes, logging meals, tracking daily targets, and reviewing/editing history.

Live production app:

https://calorie-tracker-nu-smoky.vercel.app

Built with Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma, NextAuth Google sign-in, React Query, Tesseract.js, ZXing, Vercel Blob, Neon Postgres, and Vercel.

---

## Features

- Public landing page for first-time and returning users
- Google sign-up and login with user-scoped data
- Protected dashboard, products, meal logging, calendar, profile, and edit pages
- Product library with create, edit, delete, and search
- Nutrition label OCR upload with editable extracted values
- Barcode camera scanning with OpenFoodFacts lookup
- Image uploads stored in Vercel Blob in production
- Meal logging that stays on the log screen after save for fast repeated entries
- Calendar history with editable previous meal logs
- Add missed meals to previous dates from the calendar
- Daily calorie target progress card with remaining/over-target state
- Profile page with age, weight, height, gender, activity level, maintenance calories, and target calories
- Maintenance calorie calculation using Mifflin-St Jeor with Calculator.net-style activity multipliers
- PWA/home-screen support for Android and iPhone
- Dark mode and responsive mobile navigation

---

## Quick Start

Prerequisites:

- Node.js 18.17+; Node 20+ recommended
- npm

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open:

```text
http://localhost:5000
```

The local app uses SQLite via `prisma/schema.prisma`. The local database is `prisma/dev.db`.

---

## Environment Variables

Create a local `.env` file. Do not commit secrets.

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-random-secret"
NEXTAUTH_URL="http://localhost:5000"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

Optional for local image uploads to use Vercel Blob instead of `public/uploads`:

```env
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

Production on Vercel should include:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="replace-with-a-random-secret"
NEXTAUTH_URL="https://calorie-tracker-nu-smoky.vercel.app"
APP_URL="https://calorie-tracker-nu-smoky.vercel.app"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

Google OAuth redirect URIs:

```text
http://localhost:5000/api/auth/callback/google
https://calorie-tracker-nu-smoky.vercel.app/api/auth/callback/google
```

---

## Useful Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server on `localhost:5000` |
| `npm run build` | Generate Prisma client and build Next.js |
| `npm run start` | Run the production build locally |
| `npm run vercel-build` | Push Postgres schema, generate Postgres Prisma client, and build for Vercel |
| `npm run db:migrate` | Apply local SQLite schema changes |
| `npm run db:seed` | Seed local sample data |
| `npm run db:studio` | Open Prisma Studio |

---

## App Routes

| Route | Purpose |
|---|---|
| `/` | Public landing page |
| `/login` | Google login |
| `/signup` | Google sign-up entry |
| `/dashboard` | Protected daily dashboard |
| `/products` | Product library |
| `/products/new` | Add product by OCR, barcode, or manual entry |
| `/products/[id]/edit` | Edit product nutrition details |
| `/meals/new` | Log meals for today |
| `/meals/new?date=YYYY-MM-DD` | Log a missed meal for a previous date |
| `/calendar` | History, daily totals, edit previous logs, add missed meals |
| `/profile` | Account details and calorie goals |

---

## Architecture

```text
Browser
  React + React Query + Tailwind
        |
        v
Next.js App Router
  Pages, components, middleware, API routes
        |
        +--> NextAuth Google provider
        |
        +--> Prisma
        |      +--> SQLite locally
        |      +--> Neon Postgres in production
        |
        +--> Tesseract.js + sharp for OCR
        |
        +--> OpenFoodFacts for barcode nutrition lookup
        |
        +--> Vercel Blob for uploaded label images in production
```

Local and production use separate Prisma schemas:

- `prisma/schema.prisma` uses SQLite for local development.
- `prisma/schema.postgres.prisma` uses Postgres for Vercel/Neon.

---

## Database Model

Main tables:

- `User`
- `Account`
- `Session`
- `VerificationToken`
- `Product`
- `MealEntry`

Important relationships:

- One user has many products.
- One user has many meal entries.
- A product belongs to a user.
- A meal entry belongs to a user and product.

Queries are user-scoped so users only see their own products, meals, history, and totals.

`MealEntry` stores calculated nutrients at log time:

- `calculatedCalories`
- `calculatedProtein`
- `calculatedCarbs`
- `calculatedFat`
- `calculatedFiber`
- `calculatedSugar`
- `calculatedSodium`

This keeps historical logs stable even if a product is edited later.

---

## Product Creation

Products can be created three ways:

1. Manual entry.
2. Nutrition label upload with OCR.
3. Barcode camera scan with OpenFoodFacts lookup.

Nutrition values are always editable before saving.

Product fields include:

- name
- serving base
- serving unit: `g` or `ml`
- calories
- protein
- carbs
- fat
- fiber
- sugar
- sodium
- image URL

Images are not stored in Neon as binary data. Neon stores only `imageUrl`.

- In production, uploaded label images go to Vercel Blob.
- Locally, if Blob is not configured, uploads go to `public/uploads`.
- Barcode product images come from OpenFoodFacts as external URLs.

---

## Meal Logging And History

The meal logging flow supports fast repeated entry:

- Pick a product.
- Enter quantity.
- Choose meal type.
- Click Log meal.
- Stay on the same screen and continue adding more meals.

Calendar/history supports:

- selecting previous dates
- viewing totals for that day
- editing existing meal entries
- adding missed meals to a previous date

Editing an old meal updates the existing `MealEntry` row. Adding a missed meal creates a new row for the selected date.

---

## Calorie Goals

The profile page stores:

- name
- email
- age
- weight
- height in cm
- gender
- activity level
- maintenance calories
- target calories

Maintenance calories use the Mifflin-St Jeor formula:

```text
Male BMR   = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
Female BMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
```

Then BMR is multiplied by the selected activity multiplier:

| Level | Multiplier |
|---|---:|
| Sedentary: little or no exercise | 1.2 |
| Light: exercise 1-3 times/week | 1.375 |
| Moderate: exercise 4-5 times/week | 1.465 |
| Active: daily exercise or intense exercise 3-4 times/week | 1.55 |
| Very Active: intense exercise 6-7 times/week | 1.725 |
| Extra Active: very intense exercise daily or physical job | 1.9 |

The dashboard shows consumed calories vs target calories, percentage completed, and remaining or over-target calories.

---

## PWA / Add To Home Screen

The app includes home-screen install support:

- `public/manifest.webmanifest`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/apple-touch-icon.png`
- metadata for theme color, manifest, and Apple web app mode

Android Chrome can show install/add-to-home-screen prompts. iPhone users can use Safari:

```text
Share -> Add to Home Screen
```

The installed app starts at `/dashboard`.

---

## API Routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | NextAuth | Google auth |
| `/api/products` | GET, POST | Product list and create |
| `/api/products/[id]` | GET, PATCH, DELETE | Product detail, update, delete |
| `/api/meals` | GET, POST | Meals by date, create meal entry |
| `/api/meals/[id]` | PATCH, DELETE | Edit or delete meal entry |
| `/api/ocr` | POST | OCR nutrition label image |
| `/api/upload` | POST | Upload label image |
| `/api/barcode/[barcode]` | GET | Lookup barcode via OpenFoodFacts |
| `/api/profile` | GET, PATCH | Read/update profile |
| `/api/profile/calculate-maintenance` | POST | Calculate and save maintenance calories |

---

## Folder Structure

```text
src/
  app/
    api/
      auth/[...nextauth]/
      barcode/[barcode]/
      meals/
      ocr/
      products/
      profile/
      upload/
    calendar/
    dashboard/
    login/
    meals/new/
    products/
    profile/
    signup/
    layout.tsx
    page.tsx
  components/
    dashboard/
    products/
    shared/
    ui/
  hooks/
    use-meals.ts
    use-products.ts
  lib/
    auth.ts
    nutrition.ts
    nutrition-label-parser.ts
    ocr.ts
    prisma.ts
    profile.ts
    query-client.tsx
    utils.ts
  types/
    index.ts
    next-auth.d.ts

prisma/
  schema.prisma
  schema.postgres.prisma
  seed.ts

public/
  favicon.svg
  manifest.webmanifest
  icon-192.png
  icon-512.png
  apple-touch-icon.png
  uploads/
```

---

## Deployment

The project is deployed on Vercel.

`vercel.json` uses:

```json
{
  "buildCommand": "npm run vercel-build"
}
```

Production build steps:

1. Push `prisma/schema.postgres.prisma` to Neon Postgres.
2. Generate Prisma Client against Postgres schema.
3. Build Next.js.

Deploy command:

```bash
npx --yes vercel@latest deploy --prod
```

---

## Notes

- OCR is helpful but not perfect. Users should review extracted values before saving.
- Barcode data comes from OpenFoodFacts and can be incomplete or slightly different from the physical package.
- Sodium is stored in mg.
- Serving unit can be `g` or `ml`; nutrient fields remain in grams except sodium, which remains mg.
- The app stores image URLs, not image binaries, in the database.
- If local CSS or generated assets look stale, stop the dev server, delete `.next`, and restart `npm run dev`.
