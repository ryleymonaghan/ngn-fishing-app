// ─────────────────────────────────────────────
// NGN Fishing — Species Forecast Service
// Computes per-species catch probabilities for 5-day forecast
// ─────────────────────────────────────────────

import {
  fetchWeatherForecast,
  fetchTideForecast,
  buildDayForecasts,
  calcSolunar,
} from '@services/conditionsService';
import {
  FORECAST_DAYS,
  FORECAST_CATEGORIES,
  SPECIES_SEASONALITY,
  INSHORE_SPECIES,
  OFFSHORE_SPECIES,
  DEFAULT_LOCATION,
} from '@constants/index';
import type {
  UserLocation,
  DayForecast,
  DailyFishingForecast,
  CategoryForecast,
  SpeciesForecast,
  SolunarData,
  TideReading,
} from '@app-types/index';

// ── Species name lookup ─────────────────────────
const ALL_SPECIES = [...INSHORE_SPECIES, ...OFFSHORE_SPECIES];
function getSpeciesName(id: string): string {
  return ALL_SPECIES.find(s => s.id === id)?.name ?? id;
}

// ── Score label ─────────────────────────────────
function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

// ── Compute species catch probability for one day ──
function computeSpeciesScore(
  speciesId: string,
  dayForecast: DayForecast,
): SpeciesForecast {
  const month = new Date(dayForecast.date + 'T12:00:00').getMonth(); // 0-indexed

  // ── Season factor: 0–30 points ──
  const seasonality = SPECIES_SEASONALITY[speciesId];
  const seasonFactor = seasonality
    ? Math.round(seasonality[month] * 30)
    : 15; // fallback if species not in table

  // ── Solunar factor: 0–25 points ──
  const solunarFactor = Math.round((dayForecast.solunar.rating / 100) * 25);

  // ── Tide factor: 0–25 points ──
  // More tide changes = more feeding activity (matches calcSuccessProbability logic)
  const tideChanges = dayForecast.tideEvents.length;
  const tideFactor = Math.min(tideChanges * 6, 25);

  // ── Weather factor: 0–20 points ──
  const wind = dayForecast.weather.windSpeed;
  const rain = dayForecast.weather.rainChance;
  let weatherFactor = 0;
  // Wind component (0–12)
  if (wind >= 5 && wind <= 15) weatherFactor += 12;
  else if (wind < 5) weatherFactor += 8;
  else if (wind <= 20) weatherFactor += 6;
  else if (wind <= 25) weatherFactor += 3;
  // Rain component (0–8)
  weatherFactor += Math.max(2, 8 - Math.round((rain / 100) * 6));

  // ── Total ──
  const raw = seasonFactor + solunarFactor + tideFactor + weatherFactor;
  const catchProbability = Math.min(100, Math.max(0, raw));

  return {
    speciesId,
    speciesName: getSpeciesName(speciesId),
    catchProbability,
    probabilityLabel: scoreLabel(catchProbability),
    factors: {
      season: seasonFactor,
      solunar: solunarFactor,
      tide: tideFactor,
      weather: weatherFactor,
    },
  };
}

// ── Build category forecast for one day ─────────
function buildCategoryForecasts(dayForecast: DayForecast): CategoryForecast[] {
  return FORECAST_CATEGORIES.map(cat => {
    const species = cat.speciesIds
      .map(id => computeSpeciesScore(id, dayForecast))
      .sort((a, b) => b.catchProbability - a.catchProbability);

    const topScore = species.length > 0 ? species[0].catchProbability : 0;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      topScore,
      species,
    };
  });
}

// ── Main export: fetch 5-day species forecast ───
export async function fetchSpeciesForecast(
  location: UserLocation,
): Promise<DailyFishingForecast[]> {
  const lat = location.lat;
  const lng = location.lng;
  const stationId = location.noaaStation ?? DEFAULT_LOCATION.noaaStation;

  // Fetch raw data (5 days)
  const [weatherData, tideData] = await Promise.all([
    fetchWeatherForecast(lat, lng, FORECAST_DAYS * 8), // 8 slots/day
    fetchTideForecast(stationId, FORECAST_DAYS),
  ]);

  // Build base day forecasts (weather/tide/solunar per day)
  const dayForecasts = buildDayForecasts(weatherData, tideData, lat, FORECAST_DAYS);

  // Layer species scoring on top
  return dayForecasts.map(day => {
    const categories = buildCategoryForecasts(day);

    // Overall score = average of each category's top score
    const catScores = categories.map(c => c.topScore);
    const overallScore = catScores.length > 0
      ? Math.round(catScores.reduce((sum, s) => sum + s, 0) / catScores.length)
      : 0;

    return {
      date: day.date,
      dayLabel: day.dayLabel,
      overallScore,
      overallLabel: scoreLabel(overallScore),
      categories,
      weather: day.weather,
      solunar: day.solunar,
      tideEvents: day.tideEvents,
    };
  });
}
