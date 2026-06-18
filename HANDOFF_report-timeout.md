# NGN Fishing — Session Handoff: Report Generation Timeout

**Date:** 2026-06-18
**Branch:** `claude/report-generation-timeout-gtx2g8`
**PR:** [#1](https://github.com/ryleymonaghan/ngn-fishing-app/pull/1) (draft, CI green)

---

## Problem

Report generation failed with **"The network connection was lost"** even though the
Railway backend was up (`status: running`). Two distinct causes:

1. **Client had no request timeout.** The `/api/generate-report` `fetch` fell back to
   the platform default (~60s on iOS `URLSession`). A real report takes 30–60s, so the
   socket dropped mid-generation.
2. **Backend route is slow (2+ min).** It makes one Claude call *per species* and runs
   its external data fetches *sequentially*.

---

## What was done this session

### 1. Client fix — DONE, pushed (frontend repo)

| File | Change |
|------|--------|
| `src/services/reportService.ts` | Added a **120s `AbortController` timeout** to the generate-report fetch (cleared in `finally`); distinct, friendly timeout message instead of a generic dropped-socket error. |
| `app/wizard/step3.tsx` | Loading hint changed from "15–20 seconds" → "can take up to a minute — keep this screen open." Spinners already existed on both entry points (wizard step 3 + home "Guide Me Now"). |

- ✅ `npx tsc --noEmit` clean.
- ⚠️ `npx expo export --platform web` fails at static pre-render (`reading 'v1'`) — **pre-existing**, reproduces on clean `main`; Vercel deploys `cp -r public/* dist/`, not `expo export`, so not a deploy blocker. Vercel preview deploy on the PR succeeded.

### 2. Backend optimization — REFERENCE CODE ONLY (not deployed)

Committed under `backend-reference/` (a reference artifact — this code belongs in the
**separate `ryleymonaghan/ngn-fishing-backend`** repo, which this session could not
access):

- `backend-reference/generate-report.js` — optimized Express handler:
  - **One** Claude call on **`claude-haiku-4-5`**, `max_tokens: 9000` (bounded) — not per-species.
  - NOAA tides (`8665530`), NDBC buoy (`41004`), Open-Meteo Marine, regs fetched in
    **parallel** (`Promise.all`), each with an **8s timeout + graceful fallback**.
  - **Hard 75s overall cap** → `504 { error: "...exceeded the 75s cap..." }`.
  - **Response shape unchanged** (raw Anthropic message), preserving the contract
    `reportService.ts` already parses. Also honors a pre-built `prompt`/`system`
    (back-compat).
- `backend-reference/README.md` — integration steps + a 4-species curl timing test.

---

## ⚠️ Outstanding — next session / owner action

1. **Deploy the backend optimization (requirement: Railway).**
   Paste `backend-reference/generate-report.js` into `ngn-fishing-backend/index.js`
   (or `require` it), wire `app.post('/api/generate-report', generateReportHandler)`,
   push to `main` → Railway auto-deploys.
2. **Verify `ANTHROPIC_API_KEY`** is set on Railway and has credit.
3. **Run the 4-species end-to-end test** (in `backend-reference/README.md`) and record
   total time + that it rendered. Target: well under 75s (~15–30s expected).
4. **Reconcile two assumptions** in the reference handler against the real backend:
   the **regulations source** (currently a static SC map fallback) and the
   **structured-input shape** (`species[]`, `location{lat,lng,label}`, `date`, `accessType`).
5. **iOS:** the client change is **JS-only, no native modules** — ship via **EAS Update
   (OTA)** for no new binary, or a standard JS rebuild if store-binary-only.

---

## Environment limitations hit this session (for the next agent)

- GitHub scope was **`ngn-fishing-app` only** — the backend repo `ngn-fishing-backend`
  was **denied**; no `list_repos`/`add_repo` tool to pull it in.
- **No network egress to Railway** (`host not in allowlist`), no `gh`, no Railway CLI →
  could not deploy the backend or run the live timing test from the session.
- To do the backend work in-session next time: **add `ryleymonaghan/ngn-fishing-backend`
  to the session**, and note the live test still needs an environment with egress to
  the Railway host.

---

## Deploy + test commands (run where you have Railway access)

```bash
curl -s -o /tmp/report.json -w "TOTAL: %{time_total}s  HTTP %{http_code}\n" \
  -X POST https://ngn-fishing-backend-production.up.railway.app/api/generate-report \
  -H 'Content-Type: application/json' \
  -d '{"species":["red_drum","spotted_seatrout","flounder","sheepshead"],
       "location":{"lat":32.7488,"lng":-80.0228,"label":"Johns Island, SC"},
       "date":"2026-06-19","accessType":"boat"}'

node -e "const r=require('/tmp/report.json');const t=r.content.filter(b=>b.type==='text').map(b=>b.text).join('');const j=JSON.parse(t);console.log('species:',j.species.length,'stop:',r.stop_reason)"
```
