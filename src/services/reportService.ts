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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://builderdeck-backend-production.up.railway.app';

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
    ? `Offshore conditions: ${conditions.buoy.waveHeightFt} ft waves, ` +
      `${conditions.buoy.swellPeriodSec}s swell period, water temp ${conditions.buoy.waterTempF}°F. ` +
      `Angler's boat: ${draft.boatLengthFt ?? 24} ft.`
    : '';

  return `The angler is fishing on ${draft.date} during the ${draft.timeWindow.replace('_', ' ')} from a ${draft.accessType}.
Location: ${conditions.location.label}.
Target species: ${speciesContext}.
Bait available: ${baitContext}.
Tide: ${tideInfo}.
Weather: ${weatherInfo}.
Solunar rating: ${conditions.solunar.label} (${conditions.solunar.rating}/100). Major periods: ${conditions.solunar.majorPeriods.join(', ')}.
${offshoreContext}

Generate a complete fishing report. Use only REAL, known GPS coordinates for ${conditions.location.label} and surrounding SE USA waters. 

Respond ONLY with valid JSON matching this exact schema:
{
  "conditionsSummary": "string — 2-3 sentence overview of today's conditions",
  ${draft.isOffshore ? `"offshoreGoNoGo": {
    "status": "go" | "caution" | "no_go",
    "reasoning": "string"
  },` : ''}
  "species": [
    {
      "speciesId": "string",
      "speciesName": "string",
      "biteWindow": "string (e.g. 10:30 AM – 12:30 PM)",
      "biteWindowReasoning": "string — why this window based on tide/solunar",
      "spots": [
        {
          "id": "string",
          "name": "string",
          "coordinates": { "lat": number, "lng": number },
          "depthFt": "string",
          "notes": "string — specific anchoring, approach, technique",
          "arrivalTime": "string",
          "targetSpecies": ["string"]
        }
      ],
      "rig": {
        "name": "string",
        "hookSize": "string",
        "leader": "string",
        "weight": "string",
        "baitPresentation": "string"
      },
      "baitRecommendation": "string",
      "anchoringStrategy": "string",
      "proTip": "string — one specific, actionable tip",
      "regulations": {
        "state": "SC",
        "sizeLimitIn": "string",
        "bagLimit": "string"
      }
    }
  ],
  "schedule": [
    {
      "time": "string",
      "species": "string",
      "location": "string",
      "tide": "string",
      "rig": "string"
    }
  ],
  "baitFinderTip": "string — GPS area to find live bait (diving birds, cast net spots)",
  "proTips": ["string", "string", "string"]
}`;
}

// ── Call Claude API ───────────────────────────
// On web: proxies through Railway backend (avoids CORS + keeps key server-side)
// On native: calls Anthropic API directly
async function callClaude(userPrompt: string): Promise<string> {
  let res: Response;

  if (Platform.OS === 'web') {
    res = await fetch(`${BACKEND_URL}/api/ngn/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt:     userPrompt,
        system:     CLAUDE_CONFIG.SYSTEM_PROMPT,
        model:      CLAUDE_CONFIG.MODEL,
        max_tokens: CLAUDE_CONFIG.MAX_TOKENS,
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
        max_tokens: CLAUDE_CONFIG.MAX_TOKENS,
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

  // Extract text content from response (may include tool_use blocks)
  const textContent = data.content
    ?.filter((block: any) => block.type === 'text')
    ?.map((block: any) => block.text)
    ?.join('') ?? '';

  return textContent;
}

// ── Parse Claude JSON Response ────────────────
function parseReportJson(raw: string): Partial<FishingReport> {
  // Strip markdown fences if present
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Find JSON object boundaries
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in Claude response');

  return JSON.parse(clean.slice(start, end + 1));
}

// ── Main: Generate Report ─────────────────────
export async function generateFishingReport(
  draft: WizardDraft,
  conditions: LiveConditions
): Promise<FishingReport> {
  const prompt   = buildPrompt(draft, conditions);
  const rawText  = await callClaude(prompt);
  const parsed   = parseReportJson(rawText);

  return {
    id:            uuidv4(),
    generatedAt:   new Date().toISOString(),
    conditions,
    input:         draft,
    conditionsSummary: parsed.conditionsSummary ?? '',
    offshoreGoNoGo:    parsed.offshoreGoNoGo,
    species:           parsed.species ?? [],
    schedule:          parsed.schedule ?? [],
    baitFinderTip:     parsed.baitFinderTip,
    proTips:           parsed.proTips ?? [],
  } as FishingReport;
}
