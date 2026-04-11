// ─────────────────────────────────────────────
// NGN Fishing — Conditions Service
// Fetches tides, weather, buoy data from NOAA + OpenWeather
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_ENDPOINTS, API_KEYS, NOAA_STATIONS, NOAA_BUOYS } from '@constants/index';
import type {
  TideData,
  TideReading,
  WeatherData,
  BuoyData,
  LiveConditions,
  UserLocation,
  DayForecast,
  SolunarData,
} from '@app-types/index';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL ?? 'https://ngn-fishing-backend-production.up.railway.app';

// ── Tide Direction Helper ─────────────────────
function getTideTrend(predictions: TideReading[]): 'rising' | 'falling' | 'slack' {
  const now = Date.now();
  const sorted = [...predictions].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const nextIdx = sorted.findIndex(p => new Date(p.time).getTime() > now);
  if (nextIdx === -1 || nextIdx === 0) return 'slack';

  const next = sorted[nextIdx];
  const prev = sorted[nextIdx - 1];
  const minutesToNext = (new Date(next.time).getTime() - now) / 60000;

  if (minutesToNext < 20) return 'slack';
  return next.type === 'H' ? 'rising' : 'falling';
}

// ── Wind Direction ────────────────────────────
function degreesToCardinal(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ── Fetch NOAA Tide Predictions ───────────────
export async function fetchTideData(stationId: string): Promise<TideData> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10).replace(/-/g, '');

  const params = new URLSearchParams({
    begin_date: dateStr,
    end_date:   tomorrowStr,
    station:    stationId,
    product:    'predictions',
    datum:      'MLLW',
    time_zone:  'lst_ldt',
    interval:   'hilo',
    units:      'english',
    application:'NGNFishing',
    format:     'json',
  });

  const res = await fetch(`${API_ENDPOINTS.NOAA_TIDES}?${params}`);
  if (!res.ok) throw new Error(`NOAA Tides error: ${res.status}`);

  const json = await res.json();
  const predictions: TideReading[] = (json.predictions ?? []).map((p: any) => ({
    time:   new Date(p.t).toISOString(),
    height: parseFloat(p.v),
    type:   p.type as 'H' | 'L',
  }));

  const now = Date.now();
  const upcoming = predictions.filter(p => new Date(p.time).getTime() > now);
  const nextTide = upcoming[0];
  const timeToNextTide = nextTide
    ? Math.round((new Date(nextTide.time).getTime() - now) / 60000)
    : 0;

  // Estimate current height via linear interpolation between prev and next extremes
  const prev = predictions.filter(p => new Date(p.time).getTime() <= now).at(-1);
  const next = upcoming[0];
  let currentHeight = prev?.height ?? 0;
  if (prev && next) {
    const elapsed = now - new Date(prev.time).getTime();
    const total   = new Date(next.time).getTime() - new Date(prev.time).getTime();
    currentHeight = prev.height + (next.height - prev.height) * (elapsed / total);
  }

  return {
    station: stationId,
    predictions,
    currentHeight: Math.round(currentHeight * 10) / 10,
    currentTrend:  getTideTrend(predictions),
    nextTide,
    timeToNextTide,
  };
}

// ── Fetch OpenWeather Current ─────────────────
// Always proxy through Railway backend — keeps API key server-side
export async function fetchWeatherData(lat: number, lng: number): Promise<WeatherData> {
  const res = await fetch(`${BACKEND_URL}/api/weather?lat=${lat}&lon=${lng}`);

  if (!res.ok) throw new Error(`OpenWeather error: ${res.status}`);

  const json = await res.json();

  return {
    temp:          Math.round(json.main.temp),
    feelsLike:     Math.round(json.main.feels_like),
    windSpeed:     Math.round(json.wind.speed),
    windDirection: json.wind.deg ?? 0,
    windCardinal:  degreesToCardinal(json.wind.deg ?? 0),
    conditions:    json.weather?.[0]?.description ?? 'Unknown',
    icon:          json.weather?.[0]?.icon ?? '',
    humidity:      json.main.humidity,
    visibility:    Math.round((json.visibility ?? 10000) / 1609),
  };
}

// ── Fetch NOAA Buoy (offshore) ────────────────
export async function fetchBuoyData(buoyId: string): Promise<BuoyData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/buoy/${buoyId}`);
    if (!res.ok) return null;

    const text = await res.text();
    const allLines = text.split('\n');

    // NDBC format: first line is #-prefixed column headers, second is #-prefixed units, then data rows
    const headerLine = allLines.find(l => l.startsWith('#') && l.includes('WVHT'));
    const dataLines  = allLines.filter(l => !l.startsWith('#') && l.trim());
    if (!headerLine || dataLines.length < 1) return null;

    const headers = headerLine.replace(/^#\s*/, '').trim().split(/\s+/);
    const values  = dataLines[0].trim().split(/\s+/);
    const get = (key: string) => {
      const idx = headers.indexOf(key);
      if (idx === -1) return NaN;
      const val = values[idx];
      // NDBC uses 'MM' for missing measurements
      if (!val || val === 'MM') return NaN;
      return parseFloat(val);
    };

    const waveHeightM = get('WVHT');
    const waterTempC  = get('WTMP');
    const windSpeedMs = get('WSPD');
    const domPeriod   = get('DPD');

    return {
      stationId:      buoyId,
      waveHeightFt:   isNaN(waveHeightM) ? 0 : Math.round(waveHeightM * 3.281 * 10) / 10,
      swellPeriodSec: isNaN(domPeriod)   ? 0 : domPeriod,
      waterTempF:     isNaN(waterTempC)  ? 0 : Math.round(waterTempC * 9/5 + 32),
      windSpeedKts:   isNaN(windSpeedMs) ? 0 : Math.round(windSpeedMs * 1.944),
    };
  } catch {
    return null;
  }
}

// ── Solunar Calculator (simplified) ──────────
export function calcSolunar(date: Date, lat: number): { rating: number; majors: string[]; minors: string[] } {
  // Simplified solunar table based on moon transit times
  // In production: replace with a proper solunar library
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const lunarCycle = ((dayOfYear % 29.5) / 29.5) * 100;
  const moonPhaseBonus = lunarCycle > 90 ? 20 : lunarCycle > 70 ? 10 : 0;
  const baseRating = 55 + Math.sin(dayOfYear * 0.3) * 20 + moonPhaseBonus;
  const rating = Math.min(100, Math.max(20, Math.round(baseRating)));

  // Placeholder times — replace with real solunar calculation
  return {
    rating,
    majors: ['10:30 AM', '10:30 PM'],
    minors: ['4:30 AM',  '4:30 PM' ],
  };
}

// ── Fetch 3-Day Weather Forecast ─────────────────
// Always proxy through Railway backend — keeps API key server-side
export async function fetchWeatherForecast(lat: number, lng: number, cnt: number = 24): Promise<any[]> {
  const res = await fetch(`${BACKEND_URL}/api/forecast?lat=${lat}&lon=${lng}&cnt=${cnt}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.list ?? [];
}

// ── Fetch 3-Day NOAA Tide Predictions ────────────
export async function fetchTideForecast(stationId: string, days: number): Promise<TideReading[]> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + days);
  const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');

  const params = new URLSearchParams({
    begin_date:  dateStr,
    end_date:    endStr,
    station:     stationId,
    product:     'predictions',
    datum:       'MLLW',
    time_zone:   'lst_ldt',
    interval:    'hilo',
    units:       'english',
    application: 'NGNFishing',
    format:      'json',
  });

  const res = await fetch(`${API_ENDPOINTS.NOAA_TIDES}?${params}`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.predictions ?? []).map((p: any) => ({
    time:   new Date(p.t).toISOString(),
    height: parseFloat(p.v),
    type:   p.type as 'H' | 'L',
  }));
}

// ── Success Probability Algorithm ────────────────
// Factors: solunar, tide movement, wind, rain, pressure proxy
export function calcSuccessProbability(
  solunar: SolunarData,
  tideEvents: TideReading[],
  windSpeed: number,
  rainChance: number,
): { score: number; label: string } {
  let score = 0;

  // Solunar: 0–35 points
  score += (solunar.rating / 100) * 35;

  // Tide movement: 0–25 points (more tide changes = more feeding activity)
  const tideChanges = tideEvents.length;
  score += Math.min(tideChanges * 6, 25);

  // Wind: 0–20 points (5–15 mph ideal, <5 or >20 worse)
  if (windSpeed >= 5 && windSpeed <= 15) score += 20;
  else if (windSpeed < 5)  score += 12;
  else if (windSpeed <= 20) score += 10;
  else if (windSpeed <= 25) score += 5;
  // >25 mph: 0 points

  // Rain: 0–20 points (no rain = 20, heavy rain = 5)
  score += Math.max(5, 20 - (rainChance / 100) * 15);

  score = Math.min(100, Math.max(10, Math.round(score)));

  const label =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good'      :
    score >= 40 ? 'Fair'      : 'Poor';

  return { score, label };
}

// ── Build 3-Day Forecast ─────────────────────────
export function buildDayForecasts(
  weatherForecast: any[],
  tideReadings: TideReading[],
  lat: number,
  numDays: number = 3,
): DayForecast[] {
  const days: DayForecast[] = [];
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  for (let i = 0; i < numDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[d.getDay()];

    // Filter weather entries for this day
    const dayWeather = weatherForecast.filter((w: any) => {
      const wDate = new Date(w.dt * 1000).toISOString().slice(0, 10);
      return wDate === dateStr;
    });

    // Extract daily highs/lows/conditions
    let tempHigh = -999, tempLow = 999, windMax = 0, rainChance = 0;
    let conditions = 'Clear', icon = '01d';
    for (const w of dayWeather) {
      const t = w.main?.temp ?? 70;
      if (t > tempHigh) tempHigh = t;
      if (t < tempLow) tempLow = t;
      const ws = w.wind?.speed ?? 0;
      if (ws > windMax) windMax = ws;
      if (w.pop && w.pop * 100 > rainChance) rainChance = Math.round(w.pop * 100);
      if (w.weather?.[0]) {
        conditions = w.weather[0].description ?? 'Clear';
        icon = w.weather[0].icon ?? '01d';
      }
    }
    // Defaults if no forecast data
    if (tempHigh === -999) tempHigh = 75;
    if (tempLow === 999) tempLow = 60;

    // Filter tide events for this day
    const dayTides = tideReadings.filter(t => {
      const tDate = new Date(t.time).toISOString().slice(0, 10);
      return tDate === dateStr;
    });

    // Solunar for this day
    const sol = calcSolunar(d, lat);
    const solunarLabel =
      sol.rating >= 80 ? 'Excellent' :
      sol.rating >= 60 ? 'Good'      :
      sol.rating >= 40 ? 'Fair'      : 'Poor';
    const solunarData: SolunarData = {
      rating:       sol.rating,
      label:        solunarLabel,
      majorPeriods: sol.majors,
      minorPeriods: sol.minors,
    };

    // Compute success probability
    const { score, label } = calcSuccessProbability(
      solunarData, dayTides, windMax, rainChance
    );

    days.push({
      date: dateStr,
      dayLabel,
      weather: {
        tempHigh: Math.round(tempHigh),
        tempLow:  Math.round(tempLow),
        windSpeed: Math.round(windMax),
        windCardinal: degreesToCardinal(dayWeather[0]?.wind?.deg ?? 0),
        conditions,
        icon,
        rainChance,
      },
      tideEvents: dayTides,
      solunar: solunarData,
      successProbability: score,
      successLabel: label,
    });
  }

  return days;
}

// ── Main: Fetch All Conditions ─────────────────
export async function fetchLiveConditions(location: UserLocation): Promise<LiveConditions> {
  const stationId = location.noaaStation ?? NOAA_STATIONS.CHARLESTON_HARBOR;

  const [tides, weather, buoy, weatherForecast, tideForecast] = await Promise.allSettled([
    fetchTideData(stationId),
    fetchWeatherData(location.lat, location.lng),
    fetchBuoyData(NOAA_BUOYS.CHARLESTON_OFFSHORE),
    fetchWeatherForecast(location.lat, location.lng),
    fetchTideForecast(stationId, 3),
  ]);

  if (tides.status   === 'rejected') throw new Error(`Tide fetch failed: ${tides.reason}`);
  if (weather.status === 'rejected') throw new Error(`Weather fetch failed: ${weather.reason}`);

  const solunarResult = calcSolunar(new Date(), location.lat);
  const solunarLabel =
    solunarResult.rating >= 80 ? 'Excellent' :
    solunarResult.rating >= 60 ? 'Good'      :
    solunarResult.rating >= 40 ? 'Fair'      : 'Poor';

  // Build 3-day forecast if data is available
  const forecastWeatherData = weatherForecast.status === 'fulfilled' ? weatherForecast.value : [];
  const forecastTideData    = tideForecast.status === 'fulfilled' ? tideForecast.value : [];
  const forecast = buildDayForecasts(forecastWeatherData, forecastTideData, location.lat);

  return {
    weather:   weather.value,
    tides:     tides.value,
    solunar:   {
      rating:       solunarResult.rating,
      label:        solunarLabel,
      majorPeriods: solunarResult.majors,
      minorPeriods: solunarResult.minors,
    },
    buoy:      buoy.status === 'fulfilled' ? buoy.value ?? undefined : undefined,
    forecast,
    fetchedAt: new Date().toISOString(),
    location,
  };
}
