# NGN Fishing — Claude Code Instructions

Always read NGN_HANDOFF.md at the start of every session for full project context.

## Rules
- Always run `npx tsc --noEmit` before any git push
- Always run `npx expo export --platform web --clear` before deploying to verify the build
- All API keys stay server-side on Railway — never bake keys into client bundles
- Web app proxies API calls through ngn-fishing-backend-production.up.railway.app
- Do things right the first time. No shortcuts. Save fixes to memory.
- Commit incrementally so progress isn't lost if a session dies

## Quick Reference
- **Frontend:** Vercel, auto-deploys from `main` branch
- **Backend:** Railway project "genuine-flow", auto-deploys from `main` branch
- **Domain:** ngnfishing.com
- **Stack:** Expo SDK 52, TypeScript, Zustand, Expo Router, Express backend
