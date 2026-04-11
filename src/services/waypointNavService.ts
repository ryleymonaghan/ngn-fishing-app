// ─────────────────────────────────────────────
// NGN Fishing — Waypoint Navigation Service
//
// Compass-style spot-to-spot navigation for anglers.
// Calculates bearing, distance, and ETA between the
// user's current GPS position and their target spot.
// Cycles through clustered spots so you always know
// where to go next.
// ─────────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;
const M_TO_YDS = 1.09361;
const M_TO_NM = 0.000539957;
const M_TO_MI = 0.000621371;

// ── Core Calculations ──────────────────────────

/** Haversine distance in meters between two lat/lng points */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing in degrees (0–360) from point A to point B */
export function calculateBearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const bearingRad = Math.atan2(y, x);
  return ((bearingRad * 180) / Math.PI + 360) % 360;
}

/** Convert bearing degrees to cardinal direction */
export function bearingToCardinal(bearing: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(bearing / 22.5) % 16];
}

// ── Formatted Output ────────────────────────────

export interface WaypointInfo {
  /** Distance in yards */
  distanceYds: number;
  /** Distance in nautical miles */
  distanceNm: number;
  /** Distance in statute miles */
  distanceMi: number;
  /** Bearing in degrees (0–360) */
  bearingDeg: number;
  /** Bearing as cardinal direction (e.g., 'NNE') */
  bearingCardinal: string;
  /** Estimated travel time in minutes at given speed */
  etaMinutes: number;
  /** Human-readable distance string */
  distanceLabel: string;
  /** Human-readable ETA string */
  etaLabel: string;
}

/**
 * Calculate navigation info from user's position to a target waypoint.
 * @param userLat   User's current latitude
 * @param userLng   User's current longitude
 * @param targetLat Target spot latitude
 * @param targetLng Target spot longitude
 * @param speedMph  Boat speed in MPH (default 25)
 */
export function getWaypointInfo(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  speedMph: number = 25,
): WaypointInfo {
  const distM = haversineDistance(userLat, userLng, targetLat, targetLng);
  const distYds = Math.round(distM * M_TO_YDS);
  const distNm = distM * M_TO_NM;
  const distMi = distM * M_TO_MI;
  const bearing = calculateBearing(userLat, userLng, targetLat, targetLng);

  // ETA: convert distance to hours, then minutes
  const hoursAtSpeed = distMi / Math.max(speedMph, 1);
  const etaMinutes = Math.round(hoursAtSpeed * 60);

  // Human-readable distance
  let distanceLabel: string;
  if (distYds < 500) {
    distanceLabel = `${distYds} yds`;
  } else if (distMi < 1) {
    distanceLabel = `${distNm.toFixed(1)} nm`;
  } else {
    distanceLabel = `${distMi.toFixed(1)} mi`;
  }

  // Human-readable ETA
  let etaLabel: string;
  if (etaMinutes < 1) {
    etaLabel = '< 1 min';
  } else if (etaMinutes < 60) {
    etaLabel = `${etaMinutes} min`;
  } else {
    const hrs = Math.floor(etaMinutes / 60);
    const mins = etaMinutes % 60;
    etaLabel = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  return {
    distanceYds: distYds,
    distanceNm: Math.round(distNm * 100) / 100,
    distanceMi: Math.round(distMi * 100) / 100,
    bearingDeg: Math.round(bearing),
    bearingCardinal: bearingToCardinal(bearing),
    etaMinutes,
    distanceLabel,
    etaLabel,
  };
}

/**
 * Sort spots by distance from user's current position (nearest first).
 */
export function sortSpotsByDistance<T extends { coordinates: { lat: number; lng: number } }>(
  spots: T[],
  userLat: number,
  userLng: number,
): T[] {
  return [...spots].sort((a, b) => {
    const dA = haversineDistance(userLat, userLng, a.coordinates.lat, a.coordinates.lng);
    const dB = haversineDistance(userLat, userLng, b.coordinates.lat, b.coordinates.lng);
    return dA - dB;
  });
}
