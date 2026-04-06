// ─────────────────────────────────────────────
// NGN Fishing — 72-Hour Forecast Briefing Service
// Generates a personalized fishing forecast summary
// using existing conditions data + user boat profile.
// No separate AI call — pure logic from local data.
// Fast, free, and always available.
// ─────────────────────────────────────────────

import type { LiveConditions, DayForecast, BuoyData, UserProfile } from '@app-types/index';
import { INSHORE_SPECIES, OFFSHORE_SPECIES } from '@constants/index';

// ── Go/No-Go assessment for a specific day ──
export interface DayGoNoGo {
  status: 'go' | 'marginal' | 'no_go';
  reasons: string[];
}

function assessGoNoGo(
  day: DayForecast,
  buoy: BuoyData | undefined,
  boatLengthFt: number,
): DayGoNoGo {
  const reasons: string[] = [];
  let score = 100; // start perfect, deduct

  // Wind
  const wind = day.weather.windSpeed;
  if (wind >= 25) {
    score -= 50;
    reasons.push(`Wind ${wind} mph — dangerous for most boats`);
  } else if (wind >= 20) {
    score -= 35;
    reasons.push(`Wind ${wind} mph — rough conditions`);
  } else if (wind >= 15) {
    score -= 15;
    reasons.push(`Wind ${wind} mph — choppy${boatLengthFt < 20 ? ', risky for smaller boats' : ''}`);
  }

  // Temperature
  const temp = day.weather.tempHigh;
  if (temp < 45) {
    score -= 25;
    reasons.push(`High only ${temp}°F — cold front, fish sluggish`);
  } else if (temp < 55) {
    score -= 10;
    reasons.push(`Cool day (${temp}°F) — dress warm, slower bite`);
  }

  // Rain
  if (day.weather.rainChance >= 70) {
    score -= 20;
    reasons.push(`${day.weather.rainChance}% rain chance — storms likely`);
  } else if (day.weather.rainChance >= 40) {
    score -= 5;
    reasons.push(`${day.weather.rainChance}% rain chance — be prepared`);
  }

  // Wave height (offshore/harbor) — only if buoy data available
  if (buoy) {
    const waves = buoy.waveHeightFt;
    const maxSafeWaves = boatLengthFt < 20 ? 2 : boatLengthFt < 26 ? 3 : 4;
    if (waves > maxSafeWaves + 2) {
      score -= 40;
      reasons.push(`${waves} ft seas — exceeds safe limit for ${boatLengthFt}' boat`);
    } else if (waves > maxSafeWaves) {
      score -= 20;
      reasons.push(`${waves} ft seas — borderline for ${boatLengthFt}' boat`);
    }
  }

  // Solunar (bonus/penalty)
  if (day.solunar.rating >= 80) {
    reasons.push(`Solunar ${day.solunar.rating}/100 — excellent bite potential`);
  } else if (day.solunar.rating < 30) {
    score -= 10;
    reasons.push(`Solunar only ${day.solunar.rating}/100 — weak bite windows`);
  }

  const status: DayGoNoGo['status'] =
    score >= 70 ? 'go' :
    score >= 40 ? 'marginal' :
    'no_go';

  // Add positive reason if it's a go
  if (status === 'go' && reasons.length === 0) {
    reasons.push('Conditions look good across the board');
  }

  return { status, reasons };
}

// ── Species recommendation based on conditions ──
function getTopTargets(day: DayForecast, month: number): string[] {
  const targets: string[] = [];
  const temp = day.weather.tempHigh;
  const wind = day.weather.windSpeed;

  // Season-based picks
  if (month >= 3 && month <= 5) {
    targets.push('Sheepshead', 'Redfish', 'Flounder');
    if (temp > 70) targets.push('Cobia');
  } else if (month >= 6 && month <= 8) {
    targets.push('Redfish', 'Flounder', 'Spanish Mackerel');
    if (wind < 10 && temp > 80) targets.push('Tarpon');
  } else if (month >= 9 && month <= 11) {
    targets.push('Flounder', 'Redfish', 'Speckled Trout');
    if (temp < 65) targets.push('Black Drum');
  } else {
    targets.push('Speckled Trout', 'Sheepshead', 'Redfish');
  }

  // Cold front adjustment
  if (temp < 55) {
    return ['Sheepshead', 'Black Drum', 'Speckled Trout'].slice(0, 3);
  }

  return targets.slice(0, 3);
}

// ── Build tide summary for a day ──
function tideSummary(day: DayForecast): string {
  const events = day.tideEvents;
  if (!events || events.length === 0) return 'No tide data';
  const parts = events.map((t) => {
    const time = new Date(t.time);
    const h = time.getHours();
    const m = time.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${t.type === 'H' ? 'High' : 'Low'} ${hr}:${m < 10 ? '0' : ''}${m} ${ampm}`;
  });
  return parts.join(' → ');
}

// ── Main: Generate 72-Hour Briefing ──────────
export interface ForecastDay {
  dayLabel: string;
  date: string;
  goNoGo: DayGoNoGo;
  successPct: number;
  successLabel: string;
  tempHigh: number;
  tempLow: number;
  wind: number;
  windDir: string;
  rainChance: number;
  conditions: string;
  tideSummary: string;
  solunarRating: number;
  solunarLabel: string;
  topTargets: string[];
  bestWindow: string;
}

export interface ForecastBriefing {
  generatedAt: string;
  locationLabel: string;
  boatLengthFt: number;
  days: ForecastDay[];
  bestDay: number;            // index into days[] — which day is best
  overallVerdict: string;     // one-line summary
}

export function generateForecastBriefing(
  conditions: LiveConditions,
  boatLengthFt: number = 24,
): ForecastBriefing | null {
  const forecast = conditions.forecast;
  if (!forecast || forecast.length === 0) return null;

  const month = new Date().getMonth() + 1;

  const days: ForecastDay[] = forecast.map((day) => {
    const goNoGo = assessGoNoGo(day, conditions.buoy, boatLengthFt);
    const targets = getTopTargets(day, month);
    const tides = tideSummary(day);

    // Best bite window from solunar major periods
    const majors = day.solunar.majorPeriods;
    const bestWindow = majors.length > 0 ? majors[0] : 'No strong bite window';

    return {
      dayLabel: day.dayLabel,
      date: day.date,
      goNoGo,
      successPct: day.successProbability,
      successLabel: day.successLabel,
      tempHigh: day.weather.tempHigh,
      tempLow: day.weather.tempLow,
      wind: day.weather.windSpeed,
      windDir: day.weather.windCardinal,
      rainChance: day.weather.rainChance,
      conditions: day.weather.conditions,
      tideSummary: tides,
      solunarRating: day.solunar.rating,
      solunarLabel: day.solunar.label,
      topTargets: targets,
      bestWindow,
    };
  });

  // Find best day
  let bestIdx = 0;
  let bestScore = -1;
  days.forEach((d, i) => {
    // Weight: success % + go bonus
    const goBonus = d.goNoGo.status === 'go' ? 20 : d.goNoGo.status === 'marginal' ? 0 : -30;
    const score = d.successPct + goBonus;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  });

  // Overall verdict
  const best = days[bestIdx];
  let verdict: string;
  if (best.goNoGo.status === 'no_go') {
    verdict = 'Tough 72 hours ahead. Wait for conditions to improve.';
  } else if (best.successPct >= 75) {
    verdict = `${best.dayLabel} is your day — ${best.successPct}% success, targeting ${best.topTargets[0]}.`;
  } else if (best.successPct >= 50) {
    verdict = `${best.dayLabel} looks best — decent shot at ${best.topTargets.slice(0, 2).join(' and ')}.`;
  } else {
    verdict = `Slim pickings this week. ${best.dayLabel} is your best bet at ${best.successPct}%.`;
  }

  return {
    generatedAt: new Date().toISOString(),
    locationLabel: conditions.location.label ?? 'SE Coast',
    boatLengthFt,
    days,
    bestDay: bestIdx,
    overallVerdict: verdict,
  };
}
