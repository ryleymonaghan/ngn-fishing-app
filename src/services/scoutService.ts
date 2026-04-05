// ─────────────────────────────────────────────
// NGN Fishing — Structure Scout Service
// AI-powered nearby structure analysis from a dropped pin
// Uses Claude to identify depth pockets, bottom structure,
// channels, and ledges near a user's pinned location.
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import { API_ENDPOINTS, API_KEYS, CLAUDE_CONFIG } from '@constants/index';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL ?? 'https://ngn-fishing-backend-production.up.railway.app';

// ── Scout Result Type ────────────────────────
export interface ScoutResult {
  direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  name: string;              // e.g. "Stono River Channel Drop"
  lat: number;
  lng: number;
  depthFt: string;           // e.g. "8–14 ft"
  structureType: string;     // e.g. "channel edge", "oyster bar", "deep pocket", "ledge"
  distanceYds: number;       // yards from pin
  confidence: 'high' | 'medium' | 'low';
  why: string;               // why this spot is worth fishing
  species: string[];         // best species for this structure
  approach: string;          // how to approach / anchor / position
}

// ── Build Scout Prompt ───────────────────────
function buildScoutPrompt(
  lat: number,
  lng: number,
  tideTrend: string,
  windSpeed: number,
  windDir: string,
): string {
  return `The angler has dropped a pin at coordinates ${lat.toFixed(5)}, ${lng.toFixed(5)} in the Southeast USA coastal waters.
Current conditions: tide is ${tideTrend}, wind ${windSpeed} mph from the ${windDir}.

Analyze this location and identify the BEST nearby fishing structure in each cardinal/intercardinal direction (N, NE, E, SE, S, SW, W, NW). For each direction, find the closest hidden structure or depth advantage that most anglers wouldn't know about.

Look for:
- Deep pockets or channels (depth changes = fish highways)
- Oyster bars and shell rakes (ambush points)
- Creek mouths and drain confluences (bait concentration)
- Underwater ledges and drop-offs
- Bridge pilings, dock clusters, rip-rap
- Marsh grass edges and mud flat transitions
- Submerged structure (wrecks, artificial reefs, rock piles)
- Current seams and eddies

Use ONLY real, known GPS coordinates near ${lat.toFixed(4)}, ${lng.toFixed(4)}. Each suggestion should be within 500-2000 yards of the pin. If no significant structure exists in a direction, omit that direction.

IMPORTANT: Respond with ONLY a valid JSON array — no markdown, no explanation. Each element:
[
  {
    "direction": "N",
    "name": "descriptive name of the structure/spot",
    "lat": <number>,
    "lng": <number>,
    "depthFt": "8–14 ft",
    "structureType": "channel edge",
    "distanceYds": 350,
    "confidence": "high",
    "why": "1-2 sentence explanation of why fish hold here given current conditions",
    "species": ["redfish", "flounder"],
    "approach": "how to position or approach this structure (anchor up-current, drift past, cast parallel, etc.)"
  }
]

Return 4-8 results — only the best spots worth visiting. Skip directions with nothing notable.`;
}

// ── Call Claude for Scout ─────────────────────
async function callClaudeScout(prompt: string): Promise<string> {
  let res: Response;

  if (Platform.OS === 'web') {
    res = await fetch(`${BACKEND_URL}/api/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        system: `${CLAUDE_CONFIG.SYSTEM_PROMPT} You are now in STRUCTURE SCOUT mode. Analyze GPS coordinates and identify nearby underwater structure, depth changes, and hidden fishing spots. Use real locations only.`,
        model: CLAUDE_CONFIG.MODEL,
        max_tokens: 4096,
      }),
    });
  } else {
    res = await fetch(API_ENDPOINTS.ANTHROPIC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEYS.ANTHROPIC,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_CONFIG.MODEL,
        max_tokens: 4096,
        system: `${CLAUDE_CONFIG.SYSTEM_PROMPT} You are now in STRUCTURE SCOUT mode. Analyze GPS coordinates and identify nearby underwater structure, depth changes, and hidden fishing spots. Use real locations only.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Scout API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  if (data.content && Array.isArray(data.content)) {
    const textContent = data.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');
    if (textContent) return textContent;
  }

  if (typeof data.text === 'string') return data.text;
  if (typeof data.response === 'string') return data.response;

  throw new Error('Unexpected response format from scout API');
}

// ── Parse Scout JSON ─────────────────────────
function parseScoutJson(raw: string): ScoutResult[] {
  let clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error('No JSON array found in scout response');
  }

  let jsonStr = clean.slice(start, end + 1);
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  try {
    const results = JSON.parse(jsonStr);
    if (!Array.isArray(results)) throw new Error('Not an array');
    return results as ScoutResult[];
  } catch {
    throw new Error('Failed to parse scout results');
  }
}

// ── Main: Scout Nearby Structure ─────────────
export async function scoutNearbyStructure(
  lat: number,
  lng: number,
  tideTrend: string,
  windSpeed: number,
  windDir: string,
): Promise<ScoutResult[]> {
  const prompt = buildScoutPrompt(lat, lng, tideTrend, windSpeed, windDir);
  const rawText = await callClaudeScout(prompt);
  const results = parseScoutJson(rawText);

  // Sort by confidence (high first) then distance (closest first)
  const confOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  results.sort((a, b) => {
    const confDiff = (confOrder[a.confidence] ?? 2) - (confOrder[b.confidence] ?? 2);
    if (confDiff !== 0) return confDiff;
    return a.distanceYds - b.distanceYds;
  });

  return results;
}
