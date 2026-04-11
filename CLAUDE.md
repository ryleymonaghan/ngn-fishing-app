# NGN Fishing — Claude Code Instructions

Always read NGN_HANDOFF.md at the start of every session for full project context.

## Rules
- Always run `npx tsc --noEmit` before any git push
- Always run `npx expo export --platform web --clear` before deploying to verify the build
- All API keys stay server-side on Railway — never bake keys into client bundles
- Web app proxies API calls through ngn-fishing-backend-production.up.railway.app
- Do things right the first time. No shortcuts. Save fixes to memory.
- Commit incrementally so progress isn't lost if a session dies
- Use `PATH="/opt/homebrew/bin:$PATH"` prefix when running npx/node commands in Bash tool

## Quick Reference
- **Frontend:** Vercel, auto-deploys from `main` branch
- **Backend:** Railway project "genuine-flow", auto-deploys from `main` branch
- **Domain:** ngnfishing.com
- **Stack:** Expo SDK 52 + RN 0.76, TypeScript, Zustand, Expo Router, Express backend
- **Path aliases:** `@constants`, `@app-types`, `@stores`, `@services`, `@hooks`, `@components`, `@lib`

## Architecture
```
Frontend (Expo/RN)              Backend (Express/Railway)
  app/                            index.js
    _layout.tsx                     /api/weather        → OpenWeather proxy
    login.tsx                       /api/forecast       → OpenWeather 5-day proxy (cnt param)
    tabs/                           /api/generate-report→ Claude API proxy
      index.tsx (home)              /api/places/autocomplete → Google Places proxy
      reports.tsx                   /api/places/details      → Google Places proxy
      catches.tsx                   /api/geocode/reverse     → Google Geocoding proxy
      triplog.tsx                   /api/stripe/checkout
      spots.tsx                     /api/stripe/status
      knots.tsx                     /api/stripe/webhook
      rigs.tsx                      /api/stripe/portal
      shop.tsx
      profile.tsx
    wizard/
      step1.tsx (location + date + access)
      step2.tsx (species + bait)
      step3.tsx (review + generate)
    report/
      [id].tsx (full report view)
  src/
    constants/index.ts, knots.ts, rigs.ts, shop.ts, castTracker.ts
    types/index.ts, uuid.d.ts
    stores/index.ts (5 Zustand stores)
    services/ (9 service files)
    components/forecast/ (5 UI components)
    lib/supabase.ts
```

## Env Vars (Railway)
- `OPENWEATHER_API_KEY` — OpenWeather API
- `ANTHROPIC_API_KEY` — Claude API
- `STRIPE_SECRET_KEY` — Stripe billing
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook verification
- `GOOGLE_PLACES_API_KEY` — Google Places + Geocoding (NEW — needs to be added)

## Stores (Zustand)
1. `useConditionsStore` — live weather/tide/solunar data
2. `useWizardStore` — report wizard draft (persisted)
3. `useReportStore` — generated reports history
4. `useAuthStore` — Supabase auth + subscription status (persisted)
5. `useForecastStore` — 5-day species forecast (non-persisted)

## Key Constants
- `FORECAST_DAYS = 5` — OpenWeather free tier limit
- `FORECAST_CATEGORIES` — Inshore / Offshore Trolling / Offshore Reef
- `SPECIES_SEASONALITY` — 18 species x 12 months activity matrix
- `FREE_REPORT_LIMIT = 3` — free tier report cap
- `DEFAULT_LOCATION` — Johns Island, SC (32.7488, -80.0228)
