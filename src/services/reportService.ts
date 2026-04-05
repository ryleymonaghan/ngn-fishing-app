// ─────────────────────────────────────────────
// NGN Fishing — Report Generation Service
// Uses Claude API to generate structured fishing reports
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import { API_ENDPOINTS, API_KEYS, CLAUDE_CONFIG } from '@constants/index';
import type { WizardDraft, LiveConditions, FishingReport } from '@app-types/index';
import { INSHORE_SPECIES, OFFSHORE_SPECIES, LIVE_BAIT, FROZEN_BAIT, ARTIFICIAL_BAIT } from '@constants/index';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import Constants from 'expo-constants';
const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL ?? 'https://ngn-fishing-backend-production.up.railway.app';

// ── Tuned token limit ────────────────────────────
// A 3-species report with GPS spots, rigs, schedule, and pro tips
// runs 5,000–8,000 tokens. 4096 was truncating mid-JSON.
const REPORT_MAX_TOKENS = 8192;

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

  // ── Access type descriptions for the AI ──
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

  // ── Cleaner schema prompt — explicit enum values, no pipe syntax ──
  return `The angler is fishing on ${draft.date} during the ${draft.timeWindow.replace('_', ' ')} from ${accessDesc}.
Location: ${conditions.location.label}.
Target species: ${speciesContext}.
Tide: ${tideInfo}.
Weather: ${weatherInfo}.
Solunar rating: ${conditions.solunar.label} (${conditions.solunar.rating}/100). Major periods: ${conditions.solunar.majorPeriods.join(', ')}.${offshoreContext}${deliveryContext}${shoreContext}${kayakContext}

Generate a complete fishing report. Recommend the best bait (live, frozen, and artificial options) for each species based on today's conditions — the angler has NOT pre-selected bait. Use only REAL, known GPS coordinates for ${conditions.location.label} and surrounding SE USA waters.

IMPORTANT: Respond with ONLY a valid JSON object — no markdown fences, no explanation text before or after. The JSON must match this schema exactly:

{
  "conditionsSummary": "2-3 sentence overview of today's conditions",${draft.isOffshore ? `
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
          "name": "real location name",
          "coordinates": { "lat": <number>, "lng": <number> },
          "depthFt": "e.g. 5–12 ft",
          "notes": "specific anchoring, approach, and technique notes",
          "accessType": ["boat"],
          "arrivalTime": "e.g. 10:00 AM",
          "targetSpecies": ["species id"]
        }
      ],
      "rig": {
        "name": "rig name",
        "hookSize": "e.g. #1 Aberdeen",
        "leader": "e.g. 15 lb fluorocarbon",
        "weight": "e.g. 3/8 oz jig head",
        "baitPresentation": "how to present the bait"
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
  "baitFinderTip": "GPS area to find live bait — diving birds, cast net spots",
  "proTips": ["tip 1", "tip 2", "tip 3"]
}`;
}

// ── Call Claude API ───────────────────────────
// On web: proxies through Railway backend (avoids CORS + keeps key server-side)
// On native: calls Anthropic API directly
async function callClaude(userPrompt: string): Promise<string> {
  let res: Response;

  if (Platform.OS === 'web') {
    res = await fetch(`${BACKEND_URL}/api/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt:     userPrompt,
        system:     CLAUDE_CONFIG.SYSTEM_PROMPT,
        model:      CLAUDE_CONFIG.MODEL,
        max_tokens: REPORT_MAX_TOKENS,
      }),
    });
  } else {
    res = await fetch(API_ENDPOINTS.ANTHROPIC, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         API_KEYS.ANTHROPIC,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      CLAUDE_CONFIG.MODEL,
        max_tokens: REPORT_MAX_TOKENS,
        system:     CLAUDE_CONFIG.SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  // The backend proxies the raw Anthropic response — same shape on both paths.
  // Extract text content from response (may include tool_use blocks)
  if (data.content && Array.isArray(data.content)) {
    const textContent = data.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');
    if (textContent) return textContent;
  }

  // Fallback: if backend ever wraps differently or returns plain text
  if (typeof data.text === 'string') return data.text;
  if (typeof data.response === 'string') return data.response;

  // Last resort: check stop_reason for truncation before erroring
  if (data.stop_reason === 'max_tokens') {
    throw new Error(
      'Report was too long and got cut off. Try selecting fewer species or a shorter time window.'
    );
  }

  throw new Error('Unexpected response format from report API');
}

// ── Parse Claude JSON Response ────────────────
function parseReportJson(raw: string): Partial<FishingReport> {
  // Step 1: strip markdown fences if Claude wrapped it
  let clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Step 2: find JSON object boundaries
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in AI response. The model may have returned plain text instead of JSON.');
  }

  let jsonStr = clean.slice(start, end + 1);

  // Step 3: fix common Claude JSON quirks before parsing
  // Remove trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  // Step 4: attempt parse
  try {
    return JSON.parse(jsonStr);
  } catch (firstErr) {
    // Step 5: if still failing, try to salvage truncated JSON
    // by closing any open brackets/braces
    const repaired = repairTruncatedJson(jsonStr);
    try {
      return JSON.parse(repaired);
    } catch (_) {
      // Provide a useful error message with a snippet of what we got
      const snippet = jsonStr.slice(0, 200);
      throw new Error(
        `Failed to parse AI response as JSON. Response starts with: "${snippet}..."`
      );
    }
  }
}

// ── Repair truncated JSON ─────────────────────
// If max_tokens cut off the response mid-JSON, attempt to close
// open arrays and objects so we can salvage partial data.
function repairTruncatedJson(json: string): string {
  // Remove any trailing partial string/value (after last complete value)
  let repaired = json.replace(/,\s*"[^"]*$/, '');  // trailing partial key
  repaired = repaired.replace(/,\s*$/, '');          // trailing comma
  repaired = repaired.replace(/:\s*"[^"]*$/, ': ""'); // trailing partial string value
  repaired = repaired.replace(/:\s*$/, ': null');     // trailing colon with no value

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
    offshoreGoNoGo:    parsed.offshoreGoNoGo,
    species:           parsed.species ?? [],
    schedule:          parsed.schedule ?? [],
    baitFinderTip:     parsed.baitFinderTip,
    proTips:           parsed.proTips ?? [],
  } as FishingReport;
}
