# NGN Fishing — Project Handoff
## Updated April 5, 2026

---

## Architecture

### Frontend (Expo React Native + Web)
- **Repo:** github.com/ryleymonaghan/ngn-fishing-app
- **Hosting:** Vercel (auto-deploys on push to main)
- **Domain:** ngnfishing.com
- **Stack:** Expo SDK 52, React Native 0.76, TypeScript, Zustand, Expo Router
- **Build:** `npx expo export --platform web` → output `dist/`
- **Pre-push:** always run `npx tsc --noEmit` first

### Backend (Express/Node)
- **Repo:** github.com/ryleymonaghan/ngn-fishing-backend
- **Hosting:** Railway — project "genuine-flow" (auto-deploys on push to main)
- **URL:** ngn-fishing-backend-production.up.railway.app
- **Endpoints:**
  - `GET /api/weather?lat=&lon=` — OpenWeather proxy
  - `POST /api/generate-report` — Claude API proxy
  - `GET /health` — service health check
- **Env vars on Railway:** `OPENWEATHER_API_KEY`, `ANTHROPIC_API_KEY`

### Design Decision: All API keys stay server-side on Railway
- Web app proxies weather + report calls through the backend
- Native app calls APIs directly (no CORS on mobile)
- No API keys baked into client bundles

---

## File Structure
```
ngn-fishing-app/
├── app.config.js           ← Expo config (replaced app.json)
├── babel.config.js
├── package.json
├── tsconfig.json
├── vercel.json             ← Vercel deployment config
├── .env.local              ← local dev API keys (never commit)
├── .env.example            ← template
├── assets/                 ← placeholder PNGs
│   ├── icon.png
│   ├── splash.png
│   ├── adaptive-icon.png
│   └── notification-icon.png
├── src/
│   ├── constants/index.ts  ← ALL config, colors, species, bait, routes
│   ├── types/
│   │   ├── index.ts        ← TypeScript interfaces
│   │   └── uuid.d.ts       ← uuid type declaration
│   ├── stores/index.ts     ← Zustand stores (conditions, wizard, reports, auth)
│   └── services/
│       ├── conditionsService.ts  ← NOAA tides + weather + buoy + solunar
│       └── reportService.ts     ← Claude API report generation
└── app/
    ├── _layout.tsx         ← Root stack navigator
    ├── tabs/
    │   ├── _layout.tsx     ← Tab navigator (Conditions, Reports, Spots, Profile)
    │   ├── index.tsx       ← Home screen — conditions dashboard
    │   ├── reports.tsx     ← Report history
    │   ├── spots.tsx       ← Saved spots (placeholder)
    │   └── profile.tsx     ← Subscription + boat settings
    ├── wizard/
    │   ├── _layout.tsx
    │   ├── step1.tsx       ← Date picker (7 days) + time window + access type
    │   ├── step2.tsx       ← Species selection (inshore/offshore toggle)
    │   └── step3.tsx       ← Bait selection + generate report
    └── report/
        ├── _layout.tsx
        └── [id].tsx        ← Full report display + Maps navigation

ngn-fishing-backend/
├── index.js                ← Express server (weather proxy + report proxy)
├── package.json
└── .gitignore
```

---

## What's Working
- ✅ Web app live at ngnfishing.com
- ✅ Weather conditions loading (OpenWeather via backend proxy)
- ✅ NOAA tides + buoy data
- ✅ Solunar calculator (simplified)
- ✅ Report generation via Claude API (proxied through backend)
- ✅ 7-day date picker in wizard
- ✅ 3-step report wizard (date → species → bait → generate)
- ✅ Report display with GPS spot navigation (Maps links)
- ✅ Report history tab
- ✅ Profile tab with subscription UI placeholder
- ✅ Auto-deploy: push to GitHub → Vercel (frontend) / Railway (backend)
- ✅ Web-safe location detection (browser geolocation on web, expo-location on native)
- ✅ @types alias fixed to @app-types (TypeScript compatibility)

## What's Not Built Yet
- ⬜ Login/signup screen (Supabase Auth — dependency installed, not wired)
- ⬜ Weekly forecast dashboard with catch probabilities
- ⬜ "Guide Me Now" feature (auto-location + species + bait → best spot)
- ⬜ Bathymetric/relief shading maps ($9.99/mo premium feature)
- ⬜ Stripe subscriptions (products not created yet)
- ⬜ Push notifications
- ⬜ Supabase data persistence (reports saved locally only)
- ⬜ iOS/Android native builds (EAS Build)
- ⬜ App Store submission

---

## Brand
- **App name:** NGN Fishing
- **Full name:** No Guide Needed™
- **Tagline:** "No Guide Needed"
- **Intro:** "A great fisherman isn't lucky. They understand the importance of practice, patience, and skill. But every day, the conditions are different. Typically the ones who know? They fish daily — they're guides. Welcome to No Guide Needed."
- **Domain:** ngnfishing.com ✅ live
- **Canva logo:** DAHF6-YhOaI
- **Primary color:** #0A2540 (navy)
- **Accent:** #4ECDC4 (seafoam)

---

## Key Constants
- `FREE_REPORT_LIMIT = 3`
- `PRICING.MONTHLY = $4.99`
- `PRICING.ANNUAL = $29.99`
- `DEFAULT_LOCATION = Johns Island, SC (32.7488, -80.0228)`
- `NOAA Station: 8665530 (Charleston Harbor)`
- `Claude model: claude-sonnet-4-6`
- `10 inshore species, 8 offshore species`
- `7 live baits, 6 frozen baits, 6 artificial baits`

## Monetization
- 3 free reports → paywall
- $4.99/mo or $29.99/yr
- Bathymetric maps: $9.99/mo (planned)

---

## Planned Features (Priority Order)
1. Login screen + Supabase Auth (free preview, login for full access)
2. Weekly forecast dashboard — 7-day catch probabilities factoring weather, tides, water temp, solunar, species seasonality
   - Three expandable categories: Inshore, Offshore Trolling, Offshore Reef/Bottom
   - Per-species percentage breakdowns
3. "Guide Me Now" — auto-location, current species feeding, bait selection → best spot
4. Bathymetric relief shading maps ($9.99/mo premium)
5. Stripe integration
6. Push notifications
7. iOS/Android App Store submission

---

## Railway Projects Reference
| Project | Service | Purpose |
|---------|---------|---------|
| genuine-flow | ngn-fishing-backend | NGN Fishing API (weather + report proxy) |
| abundant-charisma | builderdeck-backend | BuilderDeck API (separate, no NGN code) |

## Env Vars Reference
**Railway (ngn-fishing-backend):**
- `OPENWEATHER_API_KEY` ✅
- `ANTHROPIC_API_KEY` ✅

**Vercel (ngn-fishing-app):**
- `EXPO_PUBLIC_BACKEND_URL` ✅
- `EXPO_PUBLIC_OPENWEATHER_API_KEY` (set but unused — web proxies through backend)
