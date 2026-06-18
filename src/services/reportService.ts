// ─────────────────────────────────────────────
// NGN Fishing — Report Generation Service
// Uses Claude API to generate structured fishing reports
// ─────────────────────────────────────────────

import { CLAUDE_CONFIG } from '@constants/index';
import type { WizardDraft, LiveConditions, FishingReport } from '@app-types/index';
import { INSHORE_SPECIES, OFFSHORE_SPECIES, LIVE_BAIT, FROZEN_BAIT, ARTIFICIAL_BAIT } from '@constants/index';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import Constants from 'expo-constants';
const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL ?? 'https://ngn-fishing-backend-production.up.railway.app';

// ── Tuned token limit ────────────────────────────
// Gold-standard reports with anchor pins, troll routes, coaching,
// and 6-8 spots per species run 8,000–14,000 tokens.
// 3+ offshore species regularly exceeded 12288 and caused truncation.
const REPORT_MAX_TOKENS = 16384;

// ── Client request timeout ────────────────────────
// A full report takes 30–60s to generate. The platform default fetch
// timeout (≈60s on iOS URLSession) drops the connection mid-generation
// and surfaces as "The network connection was lost." Give the request a
// generous 120s ceiling via AbortController so a slow-but-healthy backend
// has time to finish.
const REQUEST_TIMEOUT_MS = 120_000;

// ── Build Species Context ─────────────────────
function buildSpeciesContext(speciesIds: string[]): string {
  const all = [...INSHORE_SPECIES, ...OFFSHORE_SPECIES];
  return speciesIds
    .map(id => all.find(s => s.id === id))
    .filter(Boolean)
    .map(s => `${s!.name} (season: ${s!.season})`)
    .join(', ');
}

// ── Build Bait Context ────────────────────────
function buildBaitContext(baitIds: string[]): string {
  const all = [...LIVE_BAIT, ...FROZEN_BAIT, ...ARTIFICIAL_BAIT];
  return baitIds
    .map(id => all.find(b => b.id === id)?.name)
    .filter(Boolean)
    .join(', ');
}

// ── Build Report Prompt ───────────────────────
function buildPrompt(draft: WizardDraft, conditions: LiveConditions): string {
  const speciesContext = buildSpeciesContext(draft.species);
  const baitContext    = buildBaitContext(draft.baitIds);

  const tideInfo = `${conditions.tides.currentTrend} tide, current height ${conditions.tides.currentHeight} ft, ` +
    `next ${conditions.tides.nextTide.type === 'H' ? 'High' : 'Low'} at ${
      new Date(conditions.tides.nextTide.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } (${conditions.tides.timeToNextTide} min)`;

  const weatherInfo = `${conditions.weather.temp}°F, ${conditions.weather.conditions}, ` +
    `wind ${conditions.weather.windSpeed} mph ${conditions.weather.windCardinal}`;

  const offshoreContext = draft.isOffshore && conditions.buoy
    ? `\nOffshore conditions: ${conditions.buoy.waveHeightFt} ft waves, ` +
      `${conditions.buoy.swellPeriodSec}s swell period, water temp ${conditions.buoy.waterTempF}°F. ` +
      `Angler's boat: ${draft.boatLengthFt ?? 24} ft.`
    : '';

  // ── Access type descriptions for the engine ──
  const accessDescriptions: Record<string, string> = {
    boat:  'a powerboat (center console / skiff) — full water access, can run to any spot',
    kayak: 'a kayak/canoe — paddle-powered, limited range, stay within a few miles of launch, avoid heavy boat traffic areas',
    shore: 'the shore (bank, dock, pier, jetty, or bridge) — land-based, limited to casting range from structure',
    surf:  'the surf/beach — standing in the breakers or on the sand, casting into the ocean',
    dock:  'a dock — stationary, fishing the structure and surrounding water',
  };

  const accessDesc = accessDescriptions[draft.accessType] ?? draft.accessType;

  // ── Bait delivery context (shore/surf only) ──
  let deliveryContext = '';
  if (draft.baitDeliveryMethod && draft.baitDeliveryMethod !== 'cast') {
    const deliveryDescriptions: Record<string, string> = {
      drone: 'The angler has a FISHING DRONE to fly bait out to deeper water (200-500 yards offshore). Recommend optimal drop depths and GPS coordinates reachable by drone. Include drone-specific tips: wind limits, line management, drop technique.',
      kite:  'The angler uses a KITE for bait delivery — wind-powered placement to get live bait beyond the breakers into deeper water. Include kite fishing tips: required wind speed, kite angle, release clip setup, best species for kite fishing from shore.',
      kayak_ferry: 'The angler will KAYAK BAIT OUT then fish from shore — they paddle a baited rod to deeper water, set it in a sand spike or rod holder on shore, then wait. Recommend ideal distances and depths to ferry bait to.',
    };
    deliveryContext = `\n${deliveryDescriptions[draft.baitDeliveryMethod] ?? ''}`;
  }

  // ── Shore/surf specific guidance ──
  let shoreContext = '';
  if (draft.accessType === 'shore' || draft.accessType === 'surf') {
    shoreContext = `\nIMPORTANT — This angler is LAND-BASED. All GPS spots must be accessible from shore/beach. Include:
- Specific piers, jetties, bridges, or beach access points with parking info
- Casting distance recommendations (typical shore cast = 50-100 yds)
- Best tide stages for wade fishing or surf structure
- Rig recommendations optimized for distance casting (heavier weights, aerodynamic rigs)
- Species most realistic from ${draft.accessType} access`;
  }

  // ── Kayak specific guidance ──
  let kayakContext = '';
  if (draft.accessType === 'kayak') {
    kayakContext = `\nIMPORTANT — This angler is in a KAYAK. Prioritize:
- Spots within 2-3 miles of a public kayak launch
- Sheltered creeks, flats, and marsh edges (avoid open ocean swells)
- Anchor or drift fishing techniques suited to a kayak
- Safety: avoid main shipping channels, stay aware of tidal current strength
- Lighter tackle recommendations appropriate for kayak fishing`;
  }

  // ── Location: prefer wizard-selected location over phone GPS ──
  const fishingLocationLabel = draft.fishingLocation?.label ?? conditions.location.label ?? 'Southeast US coast';

  // ── Cleaner schema prompt — explicit enum values, no pipe syntax ──
  return `The angler is fishing on ${draft.date} during the ${draft.timeWindow.replace('_', ' ')} from ${accessDesc}.
Location: ${fishingLocationLabel}.
Target species: ${speciesContext}.
Tide: ${tideInfo}.
Weather: ${weatherInfo}.
Solunar rating: ${conditions.solunar.label} (${conditions.solunar.rating}/100). Major periods: ${conditions.solunar.majorPeriods.join(', ')}.${offshoreContext}${deliveryContext}${shoreContext}${kayakContext}

Generate a COMPLETE GAME PLAN — not just a list of spots, but a full day strategy like a charter captain would build. Recommend the best bait (live, frozen, and artificial options) for each species based on today's conditions.

Use only REAL, known GPS coordinates for ${fishingLocationLabel} and surrounding SE USA waters (SCDNR artificial reefs, NOAA charts, known ledges/wrecks, documented structure).

CRITICAL GPS COORDINATE RULES:
- Provide 6 to 8 GPS spots per species — NOT just one or two.
- SPREAD spots across a 0.5–2 mile radius around each prime area so boats don't stack up on one location.
- Each spot must have UNIQUE coordinates — no duplicates. Vary lat/lng by at least 0.002 degrees (~200 yards).
- Include a mix of primary honey holes AND secondary/tertiary spots nearby.
- Name spots like chartplotter waypoints: "REEF-MAIN", "LEDGE-SE", "ANCHOR-EBB", "BAIT-SEARCH" — not generic labels.
- For each spot: approach angle, anchor position relative to structure, and drift direction based on today's wind/current.

ANCHOR PIN RULES:
- For structure fishing: compute TWO anchor pins (one for ebb current, one for flood) so the angler motors to the pin and falls back onto the structure.
- Note anchor scope (line:depth ratio) and bottom weight needed to hold in today's conditions.

GAME PLAN STRUCTURE:
- Where to launch, what time to leave the dock
- Where to get bait on the way (live bait well, cast net spot, bait shop with GPS)
- Troll routes between structure (not just waypoints — connect them into a circuit)
- The PAYOFF WINDOW: which tide turn or solunar major is the money period, and how to pace the day so the angler is fresh and in position for it
- Coaching notes: descender rig if water temp > 78°F for barotrauma releases, weight recommendations for the drift speed, when to grind vs when to move

IMPORTANT: Respond with ONLY a valid JSON object — no markdown fences, no explanation text before or after. The JSON must match this schema exactly:

{
  "conditionsSummary": "2-3 sentence overview of today's conditions and what it means for the bite",
  "launchPlan": "Where to launch, what time to leave, where to get bait on the way — specific ramp name + GPS if possible",
  "payoffWindow": "The single best window of the day (e.g. '1:15 PM tide turn + solunar major = the money period') and why — this is the climax the whole schedule builds toward",
  "coachingNotes": ["actionable coaching tip 1 — e.g. weight/tackle for today's drift", "tip 2 — e.g. descender rig for depth/temp", "tip 3 — pacing/energy management"],${draft.isOffshore ? `
  "offshoreGoNoGo": {
    "status": "go, caution, or no_go",
    "waveHeightFt": <number>,
    "boatLengthFt": <number>,
    "reasoning": "why this rating"
  },` : ''}
  "species": [
    {
      "speciesId": "the species id string",
      "speciesName": "the species common name",
      "biteWindow": "e.g. 10:30 AM – 12:30 PM",
      "biteWindowReasoning": "why this window based on tide/solunar/conditions",
      "spots": [
        {
          "id": "unique string id",
          "name": "Spot A — descriptive location name with structure reference",
          "coordinates": { "lat": <number>, "lng": <number> },
          "depthFt": "e.g. 5–12 ft",
          "notes": "specific anchoring, approach angle, drift direction, and technique notes — mention nearby structure",
          "accessType": ["boat"],
          "arrivalTime": "e.g. 10:00 AM",
          "targetSpecies": ["species id"],
          "anchorPinEbb": { "lat": 0, "lng": 0, "notes": "drop here on ebb, fall back onto structure" },
          "anchorPinFlood": { "lat": 0, "lng": 0, "notes": "drop here on flood, fall back onto structure" }
        }
      ],
      "rig": {
        "name": "rig name (e.g. Carolina Rig, Popping Cork, Fish Finder)",
        "hookSize": "e.g. #1 Aberdeen",
        "leader": "e.g. 15 lb fluorocarbon",
        "weight": "e.g. 3/8 oz jig head",
        "baitPresentation": "how to present the bait",
        "knotName": "recommended knot name (e.g. Palomar Knot, Improved Clinch)",
        "knotId": "knot id for deep linking (palomar, improved_clinch, uni, fg, snell, loop, albright, blood, surgeon, dropper_loop, bimini, nail, haywire, spider_hitch, bristol)",
        "tackleList": ["item 1 with specs", "item 2 with specs", "item 3 with specs"]
      },
      "baitRecommendation": "recommended bait (live, frozen, AND artificial options) with reasoning based on conditions",
      "anchoringStrategy": "how to position the boat/self",
      "proTip": "one specific, actionable tip for this species today",
      "regulations": {
        "state": "SC",
        "sizeLimitIn": "size limit as string",
        "bagLimit": "bag limit as string"
      }
    }
  ],
  "schedule": [
    {
      "time": "e.g. 10:00 AM",
      "species": "species name",
      "location": "spot name",
      "tide": "e.g. Falling (Fast)",
      "rig": "rig name"
    }
  ],
  "trollRoutes": [
    {
      "name": "TROLL-LEDGE-TO-REEF — descriptive route name",
      "waypoints": [{ "lat": 0, "lng": 0 }],
      "speed": "trolling speed in knots",
      "targetSpecies": ["species"],
      "notes": "what to tow, depth to run"
    }
  ],
  "baitSearchArea": {
    "name": "BAIT-SEARCH — where to find live bait on the way",
    "coordinates": { "lat": 0, "lng": 0 },
    "method": "cast net technique / what to look for (diving birds, bait flipping)",
    "species": "pogies, mullet, etc."
  },
  "baitFinderTip": "GPS area to find live bait — diving birds, cast net spots, bridge pilings",
  "proTips": ["tip 1", "tip 2", "tip 3"]
}`;
}

// ── Call Claude API ───────────────────────────
// ALL platforms (web + native) proxy through the Railway backend.
// This keeps the Anthropic API key server-side (never shipped in the app
// binary — required for App Store + basic security) and lets the backend
// own the model name, so a stale client can never pin a deprecated model
// and trigger a 404 from Anthropic.
async function callClaude(userPrompt: string): Promise<string> {
  let res: Response;

  // Abort the request if the backend takes longer than REQUEST_TIMEOUT_MS so
  // we surface a clear, actionable error instead of a generic dropped-socket.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    res = await fetch(`${BACKEND_URL}/api/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        prompt:     userPrompt,
        system:     CLAUDE_CONFIG.SYSTEM_PROMPT,
        max_tokens: REPORT_MAX_TOKENS,
        // NOTE: model is intentionally NOT sent — the backend is the single
        // source of truth for which Claude model to use.
      }),
    });
  } catch (networkErr: any) {
    if (networkErr?.name === 'AbortError') {
      throw new Error(
        `The report took longer than ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s and timed out. ` +
        `This can happen on a slow connection or when the report server is busy — please try again.`
      );
    }
    throw new Error(
      `Couldn't reach the report server (${BACKEND_URL}). ` +
      `Check your connection and try again. (${networkErr?.message ?? 'network error'})`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error || body?.message || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => '');
    }
    if (res.status === 404) {
      throw new Error(
        `Report service returned 404 — the report endpoint wasn't found at ${BACKEND_URL}/api/generate-report. ` +
        `This usually means the backend isn't deployed or BACKEND_URL points at the wrong host. ${detail}`
      );
    }
    throw new Error(`Report service error ${res.status}: ${detail}`);
  }

  const data = await res.json();

  // The backend proxies the raw Anthropic response — same shape on both paths.
  // Extract text content from response (may include tool_use blocks)
  let textContent = '';
  if (data.content && Array.isArray(data.content)) {
    textContent = data.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');
  }

  // Fallback: if backend ever wraps differently or returns plain text
  if (!textContent && typeof data.text === 'string') textContent = data.text;
  if (!textContent && typeof data.response === 'string') textContent = data.response;

  if (!textContent) {
    throw new Error('Unexpected response format from report API');
  }

  // Flag truncation so the parser can attempt repair
  const wasTruncated = data.stop_reason === 'max_tokens';
  if (wasTruncated) {
    console.warn('[NGN] Response truncated at max_tokens — will attempt JSON repair');
  }

  return textContent;
}

// ── Parse Claude JSON Response ────────────────
function parseReportJson(raw: string): Partial<FishingReport> {
  // Step 1: strip markdown fences if Claude wrapped it
  let clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Step 2: find JSON start
  const start = clean.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON object found in model response. The model may have returned plain text instead of JSON.');
  }

  // Step 3: try the full response first (lastIndexOf approach)
  let jsonStr = clean.slice(start);

  // Step 4: fix common Claude JSON quirks before parsing
  // Remove trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  // Step 5: attempt parse of full response
  try {
    return JSON.parse(jsonStr);
  } catch (firstErr) {
    // Step 6: try slicing at last } (may cut truncated tail)
    const end = jsonStr.lastIndexOf('}');
    if (end > 0) {
      try {
        return JSON.parse(jsonStr.slice(0, end + 1));
      } catch (_) { /* fall through to repair */ }
    }

    // Step 7: aggressive repair for truncated JSON
    const repaired = repairTruncatedJson(jsonStr);
    try {
      return JSON.parse(repaired);
    } catch (_) {
      // Provide a useful error message with a snippet of what we got
      const snippet = jsonStr.slice(0, 200);
      throw new Error(
        `Failed to parse model response as JSON. Response starts with: "${snippet}..."`
      );
    }
  }
}

// ── Repair truncated JSON ─────────────────────
// If max_tokens cut off the response mid-JSON, attempt to close
// open arrays and objects so we can salvage partial data.
function repairTruncatedJson(json: string): string {
  // First: close any unclosed string by finding the last unescaped quote
  // and checking if we're inside a string
  let inStr = false;
  let lastQuoteIdx = -1;
  for (let i = 0; i < json.length; i++) {
    if (json[i] === '\\' && inStr) { i++; continue; }
    if (json[i] === '"') { inStr = !inStr; lastQuoteIdx = i; }
  }
  let repaired = json;
  if (inStr) {
    // We're inside an unclosed string — close it
    repaired = json + '"';
  }

  // Remove any trailing partial string/value (after last complete value)
  repaired = repaired.replace(/,\s*"[^"]*$/, '');   // trailing partial key
  repaired = repaired.replace(/,\s*$/, '');           // trailing comma
  repaired = repaired.replace(/:\s*"[^"]*$/, ': ""'); // trailing partial string value
  repaired = repaired.replace(/:\s*$/, ': null');      // trailing colon with no value

  // Count open/close brackets and braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  // Close unclosed structures
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0)   { repaired += '}'; openBraces--; }

  return repaired;
}

// ── Main: Generate Report ─────────────────────
export async function generateFishingReport(
  draft: WizardDraft,
  conditions: LiveConditions
): Promise<FishingReport> {
  const prompt   = buildPrompt(draft, conditions);
  const rawText  = await callClaude(prompt);

  // Check for truncation signal in the raw response
  if (rawText.length > 0 && !rawText.trimEnd().endsWith('}')) {
    console.warn('[NGN] Claude response may be truncated — attempting repair');
  }

  const parsed   = parseReportJson(rawText);

  // Validate we got at least some species data
  if (!parsed.species || parsed.species.length === 0) {
    throw new Error(
      'Report generated but contained no species data. Please try again.'
    );
  }

  return {
    id:                uuidv4(),
    generatedAt:       new Date().toISOString(),
    conditions,
    input:             draft,
    conditionsSummary: parsed.conditionsSummary ?? 'Conditions data unavailable.',
    launchPlan:        parsed.launchPlan,
    payoffWindow:      parsed.payoffWindow,
    coachingNotes:     parsed.coachingNotes ?? [],
    offshoreGoNoGo:    parsed.offshoreGoNoGo,
    species:           parsed.species ?? [],
    schedule:          parsed.schedule ?? [],
    trollRoutes:       parsed.trollRoutes ?? [],
    baitSearchArea:    parsed.baitSearchArea,
    baitFinderTip:     parsed.baitFinderTip,
    proTips:           parsed.proTips ?? [],
  } as FishingReport;
}
