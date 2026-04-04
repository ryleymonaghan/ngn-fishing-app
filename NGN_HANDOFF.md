# NGN Fishing — Claude Code Handoff
## Session 1 — April 4, 2026

---

## Project Location
~/Desktop/ngn-fishing-app

## Start Every Session
cd ~/Desktop/ngn-fishing-app && claude

## First Message to Claude Code
Read /mnt/skills/user/ngn-fishing/SKILL.md then [state your goal]

---

## What's Built
- 21-file Expo Router + TypeScript scaffold
- React Native + Expo SDK 52
- Zustand stores (conditions, wizard, reports, auth)
- NOAA tides + OpenWeather + buoy services
- Claude API report generation service
- 3-step report wizard UI
- Conditions dashboard
- Report display screen with Maps navigation
- Reports history tab
- Profile tab with subscription UI

## File Structure
ngn-fishing-app/
├── app.json
├── babel.config.js
├── package.json
├── tsconfig.json
├── .env.local              ← API keys live here (never commit)
├── .env.example            ← template
├── assets/                 ← placeholder PNGs (swap with real logo)
│   ├── icon.png            ← 1024x1024 — export from Canva DAHF6-YhOaI
│   ├── splash.png
│   ├── adaptive-icon.png
│   └── notification-icon.png
├── src/
│   ├── constants/index.ts  ← ALL magic strings, colors, species, bait, routes
│   ├── types/index.ts      ← full TypeScript types
│   ├── stores/index.ts     ← Zustand stores
│   └── services/
│       ├── conditionsService.ts  ← NOAA + OpenWeather + buoy
│       └── reportService.ts      ← Claude API report generation
└── app/
    ├── _layout.tsx
    ├── tabs/
    │   ├── _layout.tsx
    │   ├── index.tsx       ← Conditions dashboard (HOME SCREEN)
    │   ├── reports.tsx     ← Report history
    │   ├── spots.tsx       ← Saved spots (placeholder, v0.2)
    │   └── profile.tsx     ← Subscription + boat settings
    ├── wizard/
    │   ├── step1.tsx       ← Date / time window / access type
    │   ├── step2.tsx       ← Species selection (inshore/offshore toggle)
    │   └── step3.tsx       ← Bait selection + generate report
    └── report/
        └── [id].tsx        ← Full report display + Maps navigation

---

## API Keys Status (.env.local)
- EXPO_PUBLIC_ANTHROPIC_API_KEY     ✅ Set
- EXPO_PUBLIC_OPENWEATHER_API_KEY   ✅ Set (regenerate — was exposed in chat)
- EXPO_PUBLIC_SUPABASE_URL          ❌ Not set yet
- EXPO_PUBLIC_SUPABASE_ANON_KEY     ❌ Not set yet
- EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ❌ Not set yet

---

## Brand
- App name: NGN Fishing
- Full name: No Guide Needed™
- Tagline: "Your AI fishing guide. No tip required."
- Domain: ngnfishing.com ✅ REGISTERED
- Canva logo: DAHF6-YhOaI
- Canva edit URL: https://www.canva.com/d/Dk92jBbgduFn5HN
- Primary color: #0A2540 (navy)
- Accent: #4ECDC4 (seafoam)
- Trademark: NGN FISHING™ — NOT YET FILED (IC 042, TEAS Plus, $350)

---

## MVP Build Order (current status)
1. ✅ Expo scaffold — done
2. 🔄 Live conditions screen — wired, needs iOS test
3. ⬜ Report wizard UI — built, needs real test
4. ⬜ Claude API report generation — built, needs real test
5. ⬜ GPS spot map — built (Maps navigation), needs test
6. ⬜ Stripe subscriptions
7. ⬜ Supabase auth
8. ⬜ Push notifications
9. ⬜ Offshore go/no-go
10. ⬜ App Store submission

---

## Immediate Next Steps (Session 2)
1. Regenerate OpenWeather API key (old one exposed in chat)
2. Get app booting on iOS simulator: npx expo start --ios
3. Test conditions screen — live tide + weather data
4. Fix any TypeScript errors
5. Run through full wizard → generate a real report
6. Verify Claude API returns structured JSON

---

## Key Constants (from src/constants/index.ts)
- FREE_REPORT_LIMIT = 3
- PRICING.MONTHLY = $4.99
- PRICING.ANNUAL = $29.99
- DEFAULT_LOCATION = Johns Island, SC (32.7488, -80.0228)
- NOAA Station: 8665530 (Charleston Harbor)
- Claude model: claude-sonnet-4-6

---

## Monetization
- 3 free reports → paywall
- $4.99/mo or $29.99/yr
- Stripe products to create in dashboard:
  - ngn_monthly — $4.99/mo
  - ngn_annual — $29.99/yr

---

## SKILL.md Location
/mnt/skills/user/ngn-fishing/SKILL.md
Update this at end of every session.
