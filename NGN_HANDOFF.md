# NGN Fishing — Project Handoff
## Updated April 5, 2026 (Session 2 — App Store Prep + Legal)

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
    │   ├── _layout.tsx     ← Hamburger drawer + tab navigator (tab bar hidden)
    │   ├── index.tsx       ← Home screen — conditions dashboard
    │   ├── reports.tsx     ← Report history
    │   ├── spots.tsx       ← GPS spot map with relief shading
    │   ├── catches.tsx     ← Photo sharing with NGN branding + social share
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
- ✅ Report generation via Claude API (proxied through backend, 8192 max_tokens)
- ✅ 7-day date picker in wizard
- ✅ 2-step report wizard (date/time/access → species → generate) — AI recommends bait
- ✅ Report display with GPS spot navigation (Maps links)
- ✅ Report history tab
- ✅ Profile tab with subscription UI placeholder
- ✅ Auto-deploy: push to GitHub → Vercel (frontend) / Railway (backend)
- ✅ Web-safe location detection (browser geolocation on web, expo-location on native)
- ✅ @types alias fixed to @app-types (TypeScript compatibility)
- ✅ Scientific UI homescreen — tactical ops console with tide curve, solunar timeline, bar gauges
- ✅ 3-day success probability forecast (factors: solunar, tides, wind, rain)
- ✅ GPS spot map tab with plotted markers + tap-to-navigate
- ✅ Relief shading — ESRI Ocean basemap + NOAA nautical chart tile overlays
- ✅ Truncated JSON repair in report parser (handles mid-response cutoffs)
- ✅ Backend forecast proxy endpoint (`/api/forecast`)
- ✅ Hamburger drawer menu (replaced bottom tab bar) with animated slide-out nav
- ✅ Compacted homescreen layout — same data, tighter spacing
- ✅ Catches photo sharing screen — camera + gallery, NGN watermark, social share with branding
- ✅ **Supabase Auth** — login/signup screen wired, auto-profile creation trigger
- ✅ **Stripe billing** — monthly ($9.99) and annual ($59.99) Pro subscription via Stripe Checkout
- ✅ **GPX chartplotter export** — generates valid GPX from report spots, web blob download + native Share API
- ✅ **"Guide Me Now"** — one-tap on home screen, auto-selects species by month/wind, generates report instantly
- ✅ **Relief shading paywall** — 4 map layers (satellite free, ocean/nautical/labels Pro), Alert with Stripe CTA
- ✅ **Push notifications service** — move-timing alerts (15-min heads-up + at-time), tide change alerts, Android channel config
- ✅ **Supabase cloud sync** — reports, saved spots, profiles, trip logs with offline fallback (fire-and-forget)
- ✅ **Trip log screen** — log catches after fishing
- ✅ **EAS Build config** — development/preview/production profiles in eas.json
- ✅ **Store metadata** — full App Store + Google Play listing in store-metadata.json
- ✅ **Supabase migration** — profiles, reports, saved_spots, trip_logs tables with RLS policies
- ✅ **Expanded access types** — boat, kayak, shore, surf, dock with AI-tailored report prompts
- ✅ **Bait delivery methods** — drone, kite, kayak ferry options for shore/surf
- ✅ **Pin & Scout** — long-press map to drop pin, AI analyzes nearby underwater structure
- ✅ **Knot Tying Guide** — 14 knots, step-by-step with pausable progress, category filters
- ✅ **Rig Assembly Guide** — 11 rigs, step-by-step with components list + knot deep-links
- ✅ **Gear Shop** — affiliate commerce with Bass Pro, Sportsman's, Amazon, contextual product recs
- ✅ **Cast Plot (Rig Tracker)** — accelerometer + gyroscope cast detection, estimates rig landing position on map. Software-only, no hardware. Tackle weight adjustment, cast history, ±15-35 yard accuracy.
- ✅ **Fishing Location Picker** — wizard step 1 now asks "Where are you fishing?" with 24 preset locations across SC, NC, GA, FL. Searchable, filterable by state. Auto-detects closest preset to phone GPS. Report uses selected location for AI prompt + re-fetches tide/weather data for that NOAA station if location differs from phone GPS by >7 miles.
- ✅ **72-Hour Forecast Briefing** — button on home screen (front and center). Tap to open modal with personalized Go/No-Go for each day based on user's boat size, wind, waves, temp, solunar. Shows success %, target species, tide schedule, best bite windows, and reasons. Highlights best day with ★. No AI call — instant from local data.

## What's Not Built Yet / Needs Finishing
- ⬜ Replace placeholder Stripe price IDs in `src/constants/index.ts` (currently placeholders)
- ⬜ Replace EAS project ID in `app.config.js`
- ⬜ Replace Apple Team ID + App Store Connect App ID in `eas.json`
- ⬜ Export 1024×1024 app icon from Canva → replace `assets/icon.png`
- ⬜ Privacy policy page at ngnfishing.com/privacy
- ⬜ Terms of service page at ngnfishing.com/terms
- ⬜ 8 App Store screenshots (listed in store-metadata.json)
- ⬜ Apple Developer account ($99/yr) — required for EAS builds
- ⬜ iOS/Android native builds (EAS Build) — config ready, needs account + icon
- ⬜ App Store submission — metadata ready in store-metadata.json
- ⬜ Provisional patent filing ($320) — recommended for move-timing algorithm

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
- `PRICING.MONTHLY = $9.99` (Pro tier — reports + maps + alerts + GPX)
- `PRICING.ANNUAL = $59.99`
- `DEFAULT_LOCATION = Johns Island, SC (32.7488, -80.0228)`
- `NOAA Station: 8665530 (Charleston Harbor)`
- `Claude model: claude-sonnet-4-6`
- `10 inshore species, 8 offshore species`
- `7 live baits, 6 frozen baits, 6 artificial baits`

---

## Planned Features (Priority Order) — UPDATED
1. ~~Login screen + Supabase Auth~~ ✅ DONE
2. ~~"Guide Me Now"~~ ✅ DONE
3. ~~Relief shading paywall~~ ✅ DONE
4. ~~Stripe integration~~ ✅ DONE (needs real price IDs)
5. ~~Push notifications~~ ✅ DONE (service built, needs real device testing)
6. ~~Supabase data persistence~~ ✅ DONE
7. iOS/Android App Store submission — NEXT (see "What's Not Built Yet" above)

## Next Session Priorities
1. Push latest commits to GitHub (from local machine)
2. Replace placeholder IDs (Stripe, EAS, Apple Team)
3. Create privacy policy + terms pages on ngnfishing.com
4. Export app icon from Canva
5. Run `npx tsc --noEmit` to verify TypeScript
6. Run `npx expo export --platform web --clear` to verify web build
7. First EAS build attempt (needs Apple Dev account)

---

## Legal & Business Status

| Item | Status | Details |
|------|--------|---------|
| **Trademark** | ✅ FILED Apr 5, 2026 | "NGN FISHING" — Serial #99745698, Standard Character Mark, Class 042, Intent to Use, $550 paid |
| **Trademark owner** | Oak Angel Digital, LLC | Correspondence: rm@crsdevelopments.com |
| **Trademark description** | Filed | "Software as a service (SaaS) services featuring software for providing artificial intelligence-generated fishing reports, real-time weather and tide conditions, GPS navigation to fishing locations, and species identification and recommendations" |
| **Delaware LLC** | ⏳ Applied | Oak Angel Digital LLC — Delaware formation applied, site under maintenance for doc uploads. Call 302-739-3073 Mon morning. |
| **Provisional patent** | 📋 Recommended | $320 filing fee. Protect move-timing algorithm (AI schedule + GPS + notifications). 12-month window to file full patent. |
| **Privacy policy** | ⬜ Needed | Must be live at ngnfishing.com/privacy before App Store submission |
| **Terms of service** | ⬜ Needed | Must be live at ngnfishing.com/terms before App Store submission |

---

## New Files Added This Session

| File | Purpose |
|------|---------|
| `src/services/notificationService.ts` | Push notification scheduling — move-timing alerts, tide change alerts, Android channel config |
| `src/services/supabaseSync.ts` | Cloud persistence — reports, saved spots, profiles, trip logs with offline fallback |
| `src/services/stripeService.ts` | Stripe Checkout integration for Pro subscription |
| `eas.json` | EAS Build config — development/preview/production profiles |
| `store-metadata.json` | Full App Store + Google Play listing metadata, screenshot requirements |
| `supabase-migration.sql` | Database schema — profiles, reports, saved_spots, trip_logs tables + RLS policies (already run in Supabase) |
| `src/services/scoutService.ts` | AI-powered structure analysis — Pin & Scout feature |
| `src/services/castTrackerService.ts` | Cast detection via accelerometer + gyroscope, estimates rig position on map |
| `src/constants/knots.ts` | 14 fishing knots database with step-by-step instructions |
| `src/constants/rigs.ts` | 11 fishing rigs database with components, steps, and knot deep-links |
| `src/constants/shop.ts` | Affiliate commerce — partners, categories, products, helper functions |
| `src/constants/castTracker.ts` | Cast tracker configuration — sensor thresholds, distance model, tackle weights |
| `app/tabs/knots.tsx` | Knot tying guide screen — filterable, step-by-step, pausable |
| `app/tabs/rigs.tsx` | Rig assembly guide screen — step-by-step with knot deep-links |
| `app/tabs/shop.tsx` | Gear shop screen — affiliate commerce with category filters |

## Modified Files This Session

| File | Changes |
|------|---------|
| `app/tabs/index.tsx` | Added "Guide Me Now" one-tap button with species auto-selection by month/wind |
| `app/tabs/spots.tsx` | Full rewrite — 4 map layers with Pro paywall, layer toggle panel, Stripe upgrade CTA |
| `app/report/[id].tsx` | Added GPX chartplotter export, "SEND TO CHARTPLOTTER" button, notification scheduling on "GOIN' FISHIN'" |
| `app/wizard/step2.tsx` | Added missing styles for AI recommend + custom species input |
| `src/stores/index.ts` | Wired cloud sync — saveReportToCloud after generation, syncUserProfile on sign-in |
| `app/tabs/spots.tsx` | Added Cast Plot feature — cast tracking toggle, tackle weight selector, rig position markers, cast info card |
| `app/tabs/_layout.tsx` | Added knots, rigs, shop to hamburger drawer menu |
| `src/constants/index.ts` | Added access types, bait delivery methods, APP_SLOGAN |
| `src/types/index.ts` | Added baitDeliveryMethod to WizardDraft |
| `app/wizard/step1.tsx` | Card layout for access types, conditional bait delivery UI |
| `src/services/reportService.ts` | Access-type-aware prompts (shore, kayak, drone, kite context) |

---

## Monetization (Updated)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 reports, satellite map only |
| Pro Monthly | $9.99/mo | Unlimited reports, all map layers (ocean/nautical/labels), GPX export, push alerts |
| Pro Annual | $59.99/yr | Same as monthly (~50% savings) |

**Stripe price IDs:** Currently placeholders in `src/constants/index.ts` — need real IDs from Stripe Dashboard.

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
