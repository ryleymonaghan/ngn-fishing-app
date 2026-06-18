# Backend reference — optimized `/api/generate-report`

> This code belongs in the **backend** repo (`ryleymonaghan/ngn-fishing-backend`, the
> Railway Express app), not in this frontend app. It's committed here as a reference
> because this Claude Code session is scoped to the frontend repo and has **no access
> to the backend repo or to Railway** — so I couldn't edit/deploy/test it directly.

## What it does (maps to the 6 requirements)

1. **Analysis** — the slow version makes one Claude call *per species* and fetches
   external data *sequentially*. This rewrite collapses that to **one** call and runs
   fetches **in parallel**.
2. **Parallel, timeout-bounded fetches** — NOAA tides (`8665530`), NDBC buoy (`41004`),
   Open-Meteo Marine, and regulations run via `Promise.all`, each wrapped in an **8s**
   timeout with a graceful fallback (`{ unavailable: true }`) so one slow source can't
   stall the report.
3. **Single fast Claude call** — `claude-haiku-4-5`, `max_tokens: 9000` (bounded),
   all gathered data in one structured prompt. No per-species calls.
4. **Unchanged response contract** — returns the raw Anthropic message
   (`{ content: [{ type:'text', text }], stop_reason }`), exactly what the app's
   `src/services/reportService.ts` parses today.
5. **Hard 75s cap** — exceeding it returns `504 { error: "...exceeded the 75s cap..." }`,
   which the app surfaces as a clean error.

## Integrate

```js
// index.js (backend)
const { generateReportHandler } = require('./generate-report');
app.post('/api/generate-report', generateReportHandler);
```

Confirm `ANTHROPIC_API_KEY` is set on Railway and has credit. Optional override:
`REPORT_MODEL` (defaults to `claude-haiku-4-5`). Swap `fetchRegulations` for your real
regs source if you have one; the static SC map is a non-blocking default.

## Deploy + test (requirement 6 — run this yourself; I can't reach Railway)

```bash
# 4-species end-to-end timing test against the deployed endpoint
curl -s -o /tmp/report.json -w "TOTAL: %{time_total}s  HTTP %{http_code}\n" \
  -X POST https://ngn-fishing-backend-production.up.railway.app/api/generate-report \
  -H 'Content-Type: application/json' \
  -d '{
    "species": ["red_drum","spotted_seatrout","flounder","sheepshead"],
    "location": { "lat": 32.7488, "lng": -80.0228, "label": "Johns Island, SC" },
    "date": "2026-06-19",
    "accessType": "boat"
  }'

# Confirm it rendered: should be valid JSON with a non-empty species array
node -e "const r=require('/tmp/report.json'); const t=r.content.filter(b=>b.type==='text').map(b=>b.text).join(''); const j=JSON.parse(t); console.log('species:', j.species.length, 'stop:', r.stop_reason)"
```

Target: well under 75s (Haiku single-call + parallel fetches typically lands ~15–30s).
