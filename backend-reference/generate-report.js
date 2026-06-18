// ─────────────────────────────────────────────────────────────────────────────
// NGN Fishing — Optimized /api/generate-report handler  (REFERENCE / DROP-IN)
//
// ⚠️  This file belongs in the BACKEND repo (ryleymonaghan/ngn-fishing-backend,
//     Railway Express app — index.js). It is committed here only as a reference
//     because this Claude Code session is scoped to the frontend repo and has no
//     access to the backend repo or to Railway. Copy this into index.js (or
//     require() it) and deploy.
//
// What changed vs. the slow version:
//   1. ONE Claude call total (not one per species) on a FAST model (Haiku).
//   2. All external data fetches (NOAA tides 8665530, NDBC buoy 41004,
//      Open-Meteo Marine, regulations) run in PARALLEL via Promise.all, each
//      wrapped in an 8s timeout with a graceful fallback so one slow/down
//      source can never stall the whole report.
//   3. Bounded max_tokens for predictable latency.
//   4. Response shape is UNCHANGED — returns the raw Anthropic message
//      ({ content: [{ type:'text', text }], stop_reason, ... }), which is
//      exactly what the app's reportService.ts parses today. Contract intact.
//   5. Hard 75s overall cap; exceeding it returns a clear JSON error.
//
// Runtime: Node 18+ (global fetch / AbortController). Anthropic SDK v0.30+.
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tunables ─────────────────────────────────────────────────────────────────
const FAST_MODEL        = process.env.REPORT_MODEL || 'claude-haiku-4-5'; // fast tier
const REPORT_MAX_TOKENS = 9000;   // bounded for latency; client repairs any truncation
const FETCH_TIMEOUT_MS  = 8000;   // per-source ceiling (requirement 2)
const OVERALL_CAP_MS    = 75000;  // hard overall cap (requirement 5)
const NOAA_TIDE_STATION = '8665530'; // Charleston Harbor
const NDBC_BUOY          = '41004';   // Edisto / SC offshore

// ── Generic timeout wrapper ──────────────────────────────────────────────────
// Races a fetch against an AbortController so a hung socket can't exceed ms,
// and returns `fallback` (never throws) so Promise.all can't be poisoned.
async function withTimeout(label, fn, fallback) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } catch (err) {
    console.warn(`[generate-report] ${label} failed/timed out: ${err?.message ?? err}`);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

// ── Source 1: NOAA tide predictions (station 8665530) ────────────────────────
async function fetchTides() {
  return withTimeout('NOAA tides', async (signal) => {
    const today = new Date();
    const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const url =
      `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
      `?product=predictions&application=ngn-fishing&datum=MLLW&time_zone=lst_ldt` +
      `&units=english&interval=hilo&format=json&station=${NOAA_TIDE_STATION}` +
      `&begin_date=${ymd}&end_date=${ymd}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`NOAA ${res.status}`);
    const data = await res.json();
    return { station: NOAA_TIDE_STATION, predictions: data.predictions ?? [] };
  }, { station: NOAA_TIDE_STATION, predictions: [], unavailable: true });
}

// ── Source 2: NDBC realtime buoy (41004) ─────────────────────────────────────
async function fetchBuoy() {
  return withTimeout('NDBC buoy', async (signal) => {
    const url = `https://www.ndbc.noaa.gov/data/realtime2/${NDBC_BUOY}.txt`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`NDBC ${res.status}`);
    const text = await res.text();
    // Line 0 = headers, line 1 = units, line 2 = most recent observation.
    const rows = text.trim().split('\n');
    const cols = (rows[2] ?? '').trim().split(/\s+/);
    const num = (v) => (v && v !== 'MM' ? Number(v) : null);
    // Standard NDBC column order: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP ...
    return {
      buoy: NDBC_BUOY,
      windDir: num(cols[5]),
      windSpeedMs: num(cols[6]),
      waveHeightM: num(cols[8]),
      dominantPeriodSec: num(cols[9]),
      waterTempC: num(cols[14]),
    };
  }, { buoy: NDBC_BUOY, unavailable: true });
}

// ── Source 3: Open-Meteo Marine ──────────────────────────────────────────────
async function fetchMarine(lat, lng) {
  return withTimeout('Open-Meteo Marine', async (signal) => {
    const url =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
      `&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period` +
      `&forecast_days=1&timezone=auto`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = await res.json();
    const h = data.hourly ?? {};
    const i = 0; // first forecast hour is enough context for the prompt
    return {
      waveHeightM: h.wave_height?.[i] ?? null,
      wavePeriodSec: h.wave_period?.[i] ?? null,
      waveDirection: h.wave_direction?.[i] ?? null,
      swellHeightM: h.swell_wave_height?.[i] ?? null,
      swellPeriodSec: h.swell_wave_period?.[i] ?? null,
    };
  }, { unavailable: true });
}

// ── Source 4: Regulations ────────────────────────────────────────────────────
// Replace the inner fn with your real regs source if you have one (DB / API).
// Defaults to a static SC saltwater map so it's instant and never blocks.
const SC_REGS = {
  red_drum:        { sizeLimitIn: '15–23"', bagLimit: '2/person, 6/boat' },
  spotted_seatrout:{ sizeLimitIn: '14"',    bagLimit: '10/person' },
  flounder:        { sizeLimitIn: '16"',    bagLimit: '5/person, 10/boat' },
  sheepshead:      { sizeLimitIn: '14"',    bagLimit: '10/person' },
  black_drum:      { sizeLimitIn: '14–27"', bagLimit: '5/person' },
  cobia:           { sizeLimitIn: '36" fork',bagLimit: '1/person, 3/boat' },
  king_mackerel:   { sizeLimitIn: '24" fork',bagLimit: '3/person' },
  spanish_mackerel:{ sizeLimitIn: '14" fork',bagLimit: '15/person' },
  red_snapper:     { sizeLimitIn: 'season-dependent', bagLimit: 'season-dependent' },
  black_sea_bass:  { sizeLimitIn: '13"',    bagLimit: '7/person' },
};
async function fetchRegulations(speciesIds = []) {
  return withTimeout('regulations', async () => {
    const out = {};
    for (const id of speciesIds) out[id] = SC_REGS[id] ?? { sizeLimitIn: 'check SCDNR', bagLimit: 'check SCDNR' };
    return { state: 'SC', species: out };
  }, { state: 'SC', species: {}, unavailable: true });
}

// ── Build the single structured prompt ───────────────────────────────────────
// The app already sends a fully-built `prompt` + `system`. If present we honor
// it (back-compat). Otherwise we build one from structured inputs + fetched data.
function buildPrompt({ species = [], location = {}, date, accessType, tides, buoy, marine, regs }) {
  const label = location.label || 'Southeast US coast';
  return `You are generating a fishing game plan. Use ONLY the live data below; do not invent conditions.

LOCATION: ${label} (${location.lat}, ${location.lng})
DATE: ${date}
ACCESS: ${accessType || 'boat'}
TARGET SPECIES: ${species.join(', ')}

LIVE DATA (some sources may be marked unavailable — adapt gracefully):
- TIDES (NOAA ${NOAA_TIDE_STATION}): ${JSON.stringify(tides)}
- BUOY (NDBC ${NDBC_BUOY}): ${JSON.stringify(buoy)}
- MARINE (Open-Meteo): ${JSON.stringify(marine)}
- REGULATIONS: ${JSON.stringify(regs)}

Produce ALL target species in ONE response. Respond with ONLY a valid JSON object,
no markdown fences, matching this schema exactly:
{
  "conditionsSummary": "string",
  "launchPlan": "string",
  "payoffWindow": "string",
  "coachingNotes": ["string"],
  "species": [{
    "speciesId": "string", "speciesName": "string",
    "biteWindow": "string", "biteWindowReasoning": "string",
    "spots": [{ "id":"string","name":"string","coordinates":{"lat":0,"lng":0},
                "depthFt":"string","notes":"string","accessType":["boat"],
                "arrivalTime":"string","targetSpecies":["string"],
                "anchorPinEbb":{"lat":0,"lng":0,"notes":"string"},
                "anchorPinFlood":{"lat":0,"lng":0,"notes":"string"} }],
    "rig": { "name":"string","hookSize":"string","leader":"string","weight":"string",
             "baitPresentation":"string","knotName":"string","knotId":"string",
             "tackleList":["string"] },
    "baitRecommendation":"string","anchoringStrategy":"string","proTip":"string",
    "regulations":{ "state":"SC","sizeLimitIn":"string","bagLimit":"string" }
  }],
  "schedule": [{ "time":"string","species":"string","location":"string","tide":"string","rig":"string" }],
  "trollRoutes": [{ "name":"string","waypoints":[{"lat":0,"lng":0}],"speed":"string","targetSpecies":["string"],"notes":"string" }],
  "baitSearchArea": { "name":"string","coordinates":{"lat":0,"lng":0},"method":"string","species":"string" },
  "baitFinderTip":"string",
  "proTips":["string"]
}
Provide 4–6 GPS spots per species with real, varied coordinates for ${label}. Be concise to fit the token budget.`;
}

// ── Route handler ────────────────────────────────────────────────────────────
// Wire as: app.post('/api/generate-report', generateReportHandler)
async function generateReportHandler(req, res) {
  const startedAt = Date.now();

  // Requirement 5: hard 75s overall cap. If we blow it, return a clear error
  // (the app surfaces res.json().error on non-2xx).
  let capped = false;
  const capTimer = setTimeout(() => {
    capped = true;
    if (!res.headersSent) {
      res.status(504).json({ error: `Report generation exceeded the ${OVERALL_CAP_MS / 1000}s cap. Please try again.` });
    }
  }, OVERALL_CAP_MS);

  try {
    const body = req.body || {};
    const { species = [], location = {}, date, accessType } = body;
    const lat = location.lat ?? 32.7488;   // DEFAULT_LOCATION (Johns Island, SC)
    const lng = location.lng ?? -80.0228;

    // Requirement 2: all external fetches in parallel, each timeout-bounded.
    const [tides, buoy, marine, regs] = await Promise.all([
      fetchTides(),
      fetchBuoy(),
      fetchMarine(lat, lng),
      fetchRegulations(species),
    ]);
    if (capped) return;

    // Back-compat: honor a pre-built prompt/system if the client sends one
    // (current app does); otherwise build from structured inputs + live data.
    const userPrompt = body.prompt || buildPrompt({ species, location, date, accessType, tides, buoy, marine, regs });
    const system = body.system || 'You are an expert SE-USA fishing guide. Output only valid JSON.';

    // Requirement 3: ONE Claude call, fast model, bounded max_tokens.
    const message = await anthropic.messages.create({
      model: FAST_MODEL,
      max_tokens: REPORT_MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });
    if (capped) return;

    clearTimeout(capTimer);

    // Requirement 4: return the raw Anthropic message shape — unchanged contract.
    // (reportService.ts reads data.content[].text and data.stop_reason.)
    console.log(`[generate-report] done in ${Date.now() - startedAt}ms, stop=${message.stop_reason}`);
    if (!res.headersSent) res.json(message);
  } catch (err) {
    clearTimeout(capTimer);
    console.error('[generate-report] error:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: `Report generation failed: ${err?.message ?? 'unknown error'}` });
    }
  }
}

module.exports = { generateReportHandler };
