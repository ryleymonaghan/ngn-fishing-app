// ─────────────────────────────────────────────
// NGN Fishing — Conditions Service
// Fetches tides, weather, buoy data from NOAA + OpenWeather
// ─────────────────────────────────────────────

import { API_ENDPOINTS, API_KEYS, NOAA_STATIONS, NOAA_BUOYS } from '@constants/index';
import type {
  TideData,
  TideReading,
  WeatherData,
  BuoyData,
  LiveConditions,
  UserLocation,
} from '@app-types/index';

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
export async function fetchWeatherData(lat: number, lng: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    lat:   lat.toString(),
    lon:   lng.toString(),
    appid: API_KEYS.OPENWEATHER,
    units: 'imperial',
  });

  const res = await fetch(`${API_ENDPOINTS.OPENWEATHER}/weather?${params}`);
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
    const res = await fetch(`${API_ENDPOINTS.NOAA_NDBC}/${buoyId}.txt`);
    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim());
    if (lines.length < 2) return null;

    const headers = lines[0].trim().split(/\s+/);
    const values  = lines[1].trim().split(/\s+/);
    const get = (key: string) => {
      const idx = headers.indexOf(key);
      return idx !== -1 ? parseFloat(values[idx]) : NaN;
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
function calcSolunar(date: Date, lat: number): { rating: number; majors: string[]; minors: string[] } {
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

// ── Main: Fetch All Conditions ─────────────────
export async function fetchLiveConditions(location: UserLocation): Promise<LiveConditions> {
  const stationId = location.noaaStation ?? NOAA_STATIONS.CHARLESTON_HARBOR;

  const [tides, weather, buoy] = await Promise.allSettled([
    fetchTideData(stationId),
    fetchWeatherData(location.lat, location.lng),
    fetchBuoyData(NOAA_BUOYS.CHARLESTON_OFFSHORE),
  ]);

  if (tides.status   === 'rejected') throw new Error(`Tide fetch failed: ${tides.reason}`);
  if (weather.status === 'rejected') throw new Error(`Weather fetch failed: ${weather.reason}`);

  const solunarResult = calcSolunar(new Date(), location.lat);
  const solunarLabel =
    solunarResult.rating >= 80 ? 'Excellent' :
    solunarResult.rating >= 60 ? 'Good'      :
    solunarResult.rating >= 40 ? 'Fair'      : 'Poor';

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
    fetchedAt: new Date().toISOString(),
    location,
  };
}
