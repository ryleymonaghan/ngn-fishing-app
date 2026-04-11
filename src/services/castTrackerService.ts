// ─────────────────────────────────────────────
// NGN Fishing — Cast Guide Service
// Guides the angler's cast toward underwater structure.
// Uses GPS for distance + magnetometer for direction.
// No sensor guessing — just compass math.
//
// Flow:
// 1. Angler anchors near a report spot
// 2. Taps "Guide My Cast" on a structure marker
// 3. App shows compass arrow pointing at target + distance
// 4. Arrow updates in real time as angler moves on deck
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import { CAST_GUIDE, type CastGuideState } from '@constants/castTracker';

// expo-sensors — guard for web
let Magnetometer: any = null;
if (Platform.OS !== 'web') {
  try {
    const Sensors = require('expo-sensors');
    Magnetometer = Sensors.Magnetometer;
  } catch {}
}

// ── Internal State ───────────────────────────
let magSubscription: any = null;
let compassHeading = 0;
let onUpdate: ((state: CastGuideState) => void) | null = null;
let target = { lat: 0, lng: 0, name: '', depth: '' };
let userLat = 0;
let userLng = 0;
let active = false;

// ── Compass heading from magnetometer ────────
function computeHeading(x: number, y: number): number {
  let heading = Math.atan2(y, x) * (180 / Math.PI);
  if (heading < 0) heading += 360;
  return heading;
}

// ── Haversine: bearing between two GPS points ─
function bearingTo(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  let bearing = toDeg(Math.atan2(y, x));
  if (bearing < 0) bearing += 360;
  return bearing;
}

// ── Haversine: distance between two GPS points (yards) ─
function distanceYards(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(meters * 1.09361); // meters to yards
}

// ── Normalize angle difference to -180..+180 ──
function angleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

// ── Emit updated state ───────────────────────
function emitUpdate(): void {
  if (!onUpdate || !active) return;

  const dist = distanceYards(userLat, userLng, target.lat, target.lng);
  const bearing = bearingTo(userLat, userLng, target.lat, target.lng);
  const offset = angleDiff(bearing, compassHeading);
  const isAimed = Math.abs(offset) <= CAST_GUIDE.AIM_TOLERANCE_DEG;

  onUpdate({
    isActive: true,
    targetLat: target.lat,
    targetLng: target.lng,
    targetName: target.name,
    targetDepth: target.depth || undefined,
    distanceYds: dist,
    bearingDeg: Math.round(bearing),
    compassHeading: Math.round(compassHeading),
    aimOffsetDeg: Math.round(offset),
    isAimedAtTarget: isAimed,
  });
}

// ── Magnetometer handler ─────────────────────
function handleMagData(data: { x: number; y: number; z: number }) {
  compassHeading = computeHeading(data.x, data.y);
  emitUpdate();
}

// ════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════

/** Check if cast guide is available (needs magnetometer) */
export function isCastGuideAvailable(): boolean {
  return Platform.OS !== 'web' && Magnetometer !== null;
}

/** Start guiding toward a target structure */
export async function startCastGuide(
  targetLat: number,
  targetLng: number,
  targetName: string,
  targetDepth: string,
  callback: (state: CastGuideState) => void,
): Promise<boolean> {
  if (!isCastGuideAvailable()) return false;

  // Stop any existing guide
  stopCastGuide();

  target = { lat: targetLat, lng: targetLng, name: targetName, depth: targetDepth };
  onUpdate = callback;
  active = true;

  try {
    Magnetometer.setUpdateInterval(CAST_GUIDE.COMPASS_UPDATE_INTERVAL_MS);
    magSubscription = Magnetometer.addListener(handleMagData);
    return true;
  } catch {
    active = false;
    return false;
  }
}

/** Stop the cast guide */
export function stopCastGuide(): void {
  if (magSubscription) {
    magSubscription.remove();
    magSubscription = null;
  }
  active = false;
  onUpdate = null;
}

/** Update the angler's GPS position (call on location updates) */
export function updateAnglerPosition(lat: number, lng: number): void {
  userLat = lat;
  userLng = lng;
  if (active) emitUpdate();
}

/** Get bearing as compass cardinal label */
export function bearingToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

/** Check if target is within castable distance */
export function isCastable(distYds: number): boolean {
  return distYds <= CAST_GUIDE.MAX_CASTABLE_DISTANCE_YDS;
}
