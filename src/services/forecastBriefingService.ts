// ─────────────────────────────────────────────
// NGN Fishing — 72-Hour Forecast Briefing Service
// Generates a personalized fishing forecast summary
// using existing conditions data + user boat profile.
// No separate AI call — pure logic from local data.
// Fast, free, and always available.
// ─────────────────────────────────────────────

import type { LiveConditions, DayForecast, BuoyData, UserProfile } from '@app-types/index';
import { INSHORE_SPECIES, OFFSHORE_SPECIES } from '@constants/index';

// ── Traffic Light Assessment ──
// GREEN: Beautiful day. Low winds (W/SW/S preferred, under 15 gusts),
//        calm seas, warm water, easy tides, no storms.
// YELLOW: Potentially stormy (70%+), winds from any direction picking up,
//         slightly choppy, medium tides. Fishable but not ideal.
// RED:    Bad weather, windy, high tides, choppy, small craft advisory
//         conditions. Stay home.
export type LightStatus = 'green' | 'yellow' | 'red';

export interface DayAssessment {
  light: LightStatus;
  reasons: string[];
}

// Favorable wind directions for SE coast fishing
const GOOD_WIND_DIRS = ['W', 'WSW', 'SW', 'SSW', 'S'];

function assessDay(
  day: DayForecast,
  buoy: BuoyData | undefined,
  boatLengthFt: number,
): DayAssessment {
  const reasons: string[] = [];
  let redFlags = 0;    // any 1 = RED
  let yellowFlags = 0; // 2+ = YELLOW, combined with other factors

  const wind = day.weather.windSpeed;
  const windDir = day.weather.windCardinal;
  const rain = day.weather.rainChance;
  const temp = day.weather.tempHigh;
  const isGoodWindDir = GOOD_WIND_DIRS.includes(windDir);

  // ── WIND ──────────────────────────────────
  if (wind >= 25) {
    redFlags++;
    reasons.push(`Wind ${wind} mph — small craft advisory territory`);
  } else if (wind >= 20) {
    redFlags++;
    reasons.push(`Wind ${wind} mph ${windDir} — too rough for most boats`);
  } else if (wind >= 15) {
    yellowFlags += 2;
    reasons.push(`Wind ${wind} mph ${windDir} — choppy, gusts could be worse`);
  } else if (wind >= 10) {
    if (!isGoodWindDir) {
      yellowFlags++;
      reasons.push(`Wind ${wind} mph from ${windDir} — not ideal direction`);
    } else {
      reasons.push(`Light wind ${wind} mph from ${windDir} — manageable`);
    }
  } else {
    reasons.push(`Light winds ${wind} mph ${windDir} — calm conditions`);
  }

  // ── RAIN / STORMS ─────────────────────────
  if (rain >= 80) {
    // 80%+ rain = almost certainly storming, especially combined with wind
    if (wind >= 12) {
      redFlags++;
      reasons.push(`${rain}% rain + ${wind} mph wind — storms and rough water`);
    } else {
      yellowFlags += 2;
      reasons.push(`${rain}% rain chance — storms likely, lightning risk`);
    }
  } else if (rain >= 70) {
    yellowFlags += 2;
    reasons.push(`${rain}% rain chance — storms likely`);
    // 70%+ rain combined with 15+ wind = RED
    if (wind >= 15) {
      redFlags++;
      reasons.push(`Storms + wind combo — not worth the risk`);
    }
  } else if (rain >= 50) {
    yellowFlags++;
    reasons.push(`${rain}% rain chance — pack rain gear`);
  } else if (rain >= 30) {
    reasons.push(`${rain}% rain chance — scattered showers possible`);
  }

  // ── WAVES / SEAS (buoy data) ──────────────
  if (buoy) {
    const waves = buoy.waveHeightFt;
    // Scale max safe waves by boat size
    const maxSafe = boatLengthFt < 18 ? 1.5 : boatLengthFt < 22 ? 2 : boatLengthFt < 26 ? 3 : 4;

    if (waves > maxSafe + 2) {
      redFlags++;
      reasons.push(`${waves} ft seas — dangerous for ${boatLengthFt}' boat`);
    } else if (waves > maxSafe) {
      yellowFlags += 2;
      reasons.push(`${waves} ft seas — rough ride in a ${boatLengthFt}' boat`);
    } else if (waves <= 1.5) {
      reasons.push(`${waves} ft seas — glass`);
    } else {
      reasons.push(`${waves} ft seas — manageable`);
    }

    // Water temp
    if (buoy.waterTempF < 55) {
      yellowFlags++;
      reasons.push(`Water temp ${buoy.waterTempF}°F — cold, slow metabolism`);
    } else if (buoy.waterTempF >= 72) {
      reasons.push(`Water temp ${buoy.waterTempF}°F — fish are active`);
    }
  }

  // ── TEMPERATURE ───────────────────────────
  if (temp < 40) {
    yellowFlags += 2;
    reasons.push(`High only ${temp}°F — brutal cold, fish locked up`);
  } else if (temp < 50) {
    yellowFlags++;
    reasons.push(`Cold day (${temp}°F) — slow fishing, dress warm`);
  } else if (temp >= 75 && temp <= 90) {
    reasons.push(`${temp}°F — comfortable fishing weather`);
  }

  // ── SOLUNAR ───────────────────────────────
  if (day.solunar.rating >= 80) {
    reasons.push(`Solunar ${day.solunar.rating}/100 — peak feeding activity`);
  } else if (day.solunar.rating >= 60) {
    reasons.push(`Solunar ${day.solunar.rating}/100 — good bite windows`);
  } else if (day.solunar.rating < 30) {
    yellowFlags++;
    reasons.push(`Solunar ${day.solunar.rating}/100 — weak bite windows`);
  }

  // ── DETERMINE LIGHT ───────────────────────
  let light: LightStatus;
  if (redFlags > 0) {
    light = 'red';
  } else if (yellowFlags >= 2) {
    light = 'yellow';
  } else {
    light = 'green';
  }

  // ── GREEN gets positive summary at top ────
  if (light === 'green') {
    // Move positive reasons to the top, add a summary if none exist
    const positives = reasons.filter(r =>
      r.includes('calm') || r.includes('Light wind') || r.includes('glass') ||
      r.includes('comfortable') || r.includes('peak feeding') || r.includes('manageable')
    );
    if (positives.length === 0) {
      reasons.unshift('Solid conditions — get out there');
    }
  }

  return { light, reasons };
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
  assessment: DayAssessment;
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
    const assessment = assessDay(day, conditions.buoy, boatLengthFt);
    const targets = getTopTargets(day, month);
    const tides = tideSummary(day);

    // Best bite window from solunar major periods
    const majors = day.solunar.majorPeriods;
    const bestWindow = majors.length > 0 ? majors[0] : 'No strong bite window';

    return {
      dayLabel: day.dayLabel,
      date: day.date,
      assessment,
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
    const lightBonus = d.assessment.light === 'green' ? 25 : d.assessment.light === 'yellow' ? 0 : -40;
    const score = d.successPct + lightBonus;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  });

  // Overall verdict
  const best = days[bestIdx];
  let verdict: string;
  if (best.assessment.light === 'red') {
    verdict = 'Red light across the board. Bad conditions — stay home, tie rigs, plan for next week.';
  } else if (best.assessment.light === 'green' && best.successPct >= 70) {
    verdict = `Green light ${best.dayLabel} — ${best.successPct}% success. Go get ${best.topTargets[0]}.`;
  } else if (best.assessment.light === 'green') {
    verdict = `${best.dayLabel} is your window — green light, target ${best.topTargets.slice(0, 2).join(' and ')}.`;
  } else if (best.assessment.light === 'yellow' && best.successPct >= 60) {
    verdict = `${best.dayLabel} is fishable but iffy — keep an eye on the radar.`;
  } else {
    verdict = `Slim pickings. ${best.dayLabel} is your best shot at ${best.successPct}% — yellow light.`;
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
