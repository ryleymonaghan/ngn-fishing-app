// ─────────────────────────────────────────────
// NGN Fishing — Cast Tracker Service
// Detects fishing casts via accelerometer spike,
// estimates distance from peak force + tackle weight,
// estimates bearing from gyroscope rotation data,
// and plots estimated rig position on the map.
//
// Accuracy: ±15-35 yards depending on distance.
// Not pinpoint — but enough to confirm "your rig
// is over that ledge, not in the sand flat."
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import { CAST_TRACKER, type CastEstimate } from '@constants/castTracker';

// expo-sensors doesn't work on web — guard the import
let Accelerometer: any = null;
let Gyroscope: any = null;
let Magnetometer: any = null;

if (Platform.OS !== 'web') {
  try {
    const Sensors = require('expo-sensors');
    Accelerometer = Sensors.Accelerometer;
    Gyroscope = Sensors.Gyroscope;
    Magnetometer = Sensors.Magnetometer;
  } catch {
    // Sensors unavailable — cast tracker disabled
  }
}

// ── Internal State ───────────────────────────
interface SensorState {
  isListening: boolean;
  accelSubscription: any;
  gyroSubscription: any;
  magSubscription: any;

  // Cast detection state machine
  phase: 'idle' | 'triggered' | 'cooldown';
  triggerTime: number;
  peakAccel: number;

  // Gyroscope accumulation during cast
  gyroYaw: number;     // accumulated rotation around vertical axis (radians)
  gyroPitch: number;   // accumulated rotation around lateral axis

  // Compass heading from magnetometer
  compassHeading: number; // degrees, 0 = North

  // Current tackle weight setting
  tackleWeight: string;

  // Callback when cast is detected
  onCastDetected: ((cast: CastEstimate) => void) | null;

  // User's GPS position (must be set before tracking)
  userLat: number;
  userLng: number;
}

const state: SensorState = {
  isListening: false,
  accelSubscription: null,
  gyroSubscription: null,
  magSubscription: null,
  phase: 'idle',
  triggerTime: 0,
  peakAccel: 0,
  gyroYaw: 0,
  gyroPitch: 0,
  compassHeading: 0,
  tackleWeight: 'medium',
  onCastDetected: null,
  userLat: 0,
  userLng: 0,
};

// Track cast count for unique IDs
let castCounter = 0;

// ── Utility: compute total acceleration magnitude ──
function accelMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

// ── Utility: compass heading from magnetometer ──
function computeHeading(x: number, y: number): number {
  let heading = Math.atan2(y, x) * (180 / Math.PI);
  if (heading < 0) heading += 360;
  return heading;
}

// ── Utility: move a GPS coordinate by distance + bearing ──
// Uses the haversine formula in reverse (destination point)
function destinationPoint(
  lat: number,
  lng: number,
  distanceYards: number,
  bearingDeg: number,
): { lat: number; lng: number } {
  const R = 6371000; // Earth radius in meters
  const distMeters = distanceYards * 0.9144;
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distMeters / R) +
    Math.cos(lat1) * Math.sin(distMeters / R) * Math.cos(bearingRad)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distMeters / R) * Math.cos(lat1),
    Math.cos(distMeters / R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

// ── Estimate cast distance from peak acceleration ──
function estimateDistance(peakAccel: number, tackleWeight: string): number {
  // Distance model: take peak accel above the trigger threshold,
  // multiply by base factor, adjust for tackle weight.
  const excessAccel = Math.max(0, peakAccel - CAST_TRACKER.CAST_ACCEL_TRIGGER);
  const weightFactor = CAST_TRACKER.WEIGHT_FACTORS[tackleWeight] ?? 1.0;
  const raw = excessAccel * CAST_TRACKER.DISTANCE_BASE_MULTIPLIER * weightFactor;

  // Clamp to plausible range
  return Math.min(
    CAST_TRACKER.MAX_CAST_DISTANCE_YDS,
    Math.max(CAST_TRACKER.MIN_CAST_DISTANCE_YDS, Math.round(raw))
  );
}

// ── Estimate bearing from gyroscope yaw + compass ──
function estimateBearing(compassHeading: number, gyroYaw: number): number {
  // The gyroscope yaw accumulates rotation during the cast.
  // Combined with the compass heading at cast time, we get
  // the estimated direction the cast was thrown.
  // Gyro yaw in radians → convert to degrees
  const yawDeg = (gyroYaw * 180) / Math.PI;

  // Cast direction = compass heading + rotational offset
  // Most casts go roughly forward from the phone's orientation
  let bearing = (compassHeading + yawDeg) % 360;
  if (bearing < 0) bearing += 360;
  return Math.round(bearing);
}

// ── Accuracy radius based on distance ──
function getAccuracyRadius(distanceYds: number): number {
  if (distanceYds < 30) return CAST_TRACKER.ACCURACY_RADIUS_NEAR_YDS;
  if (distanceYds < 80) return CAST_TRACKER.ACCURACY_RADIUS_MID_YDS;
  return CAST_TRACKER.ACCURACY_RADIUS_FAR_YDS;
}

// ── Process a completed cast ─────────────────
function processCast(): void {
  if (!state.onCastDetected) return;
  if (state.userLat === 0 && state.userLng === 0) return;

  const distanceYds = estimateDistance(state.peakAccel, state.tackleWeight);
  const bearing = estimateBearing(state.compassHeading, state.gyroYaw);
  const dest = destinationPoint(state.userLat, state.userLng, distanceYds, bearing);
  const accuracyYds = getAccuracyRadius(distanceYds);

  castCounter += 1;
  const cast: CastEstimate = {
    id: `cast-${Date.now()}-${castCounter}`,
    timestamp: Date.now(),
    userLat: state.userLat,
    userLng: state.userLng,
    estimatedLat: dest.lat,
    estimatedLng: dest.lng,
    estimatedDistanceYds: distanceYds,
    estimatedBearing: bearing,
    peakAcceleration: Math.round(state.peakAccel * 10) / 10,
    tackleWeight: state.tackleWeight,
    accuracyRadiusYds: accuracyYds,
    isStale: false,
  };

  state.onCastDetected(cast);
}

// ── Accelerometer Handler ────────────────────
function handleAccelData(data: { x: number; y: number; z: number }) {
  const mag = accelMagnitude(data.x, data.y, data.z);
  const now = Date.now();

  switch (state.phase) {
    case 'idle':
      if (mag >= CAST_TRACKER.CAST_ACCEL_TRIGGER) {
        state.phase = 'triggered';
        state.triggerTime = now;
        state.peakAccel = mag;
        // Reset gyro accumulation for this cast
        state.gyroYaw = 0;
        state.gyroPitch = 0;
      }
      break;

    case 'triggered':
      // Track peak
      if (mag > state.peakAccel) state.peakAccel = mag;

      // Check if cast has settled (decelerated)
      if (mag <= CAST_TRACKER.CAST_ACCEL_SETTLE) {
        const elapsed = now - state.triggerTime;
        if (elapsed <= CAST_TRACKER.CAST_WINDOW_MS) {
          // Valid cast detected!
          processCast();
        }
        // Either way, enter cooldown
        state.phase = 'cooldown';
        setTimeout(() => {
          state.phase = 'idle';
        }, CAST_TRACKER.CAST_COOLDOWN_MS);
      } else if (now - state.triggerTime > CAST_TRACKER.CAST_WINDOW_MS) {
        // Took too long — not a cast (shaking, etc.)
        state.phase = 'cooldown';
        setTimeout(() => {
          state.phase = 'idle';
        }, CAST_TRACKER.CAST_COOLDOWN_MS);
      }
      break;

    case 'cooldown':
      // Ignore data during cooldown
      break;
  }
}

// ── Gyroscope Handler ────────────────────────
function handleGyroData(data: { x: number; y: number; z: number }) {
  if (state.phase === 'triggered') {
    // Accumulate rotation during the active cast
    // z-axis = yaw (rotation around vertical — cast direction)
    // x-axis = pitch (rotation around lateral — overhead vs sidearm)
    const dt = CAST_TRACKER.SENSOR_UPDATE_INTERVAL_MS / 1000;
    state.gyroYaw += data.z * dt;
    state.gyroPitch += data.x * dt;
  }
}

// ── Magnetometer Handler ─────────────────────
function handleMagData(data: { x: number; y: number; z: number }) {
  state.compassHeading = computeHeading(data.x, data.y);
}

// ════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════

/** Check if cast tracking is available on this device */
export function isCastTrackerAvailable(): boolean {
  return Platform.OS !== 'web' && Accelerometer !== null;
}

/** Start listening for casts */
export async function startCastTracking(
  onCastDetected: (cast: CastEstimate) => void,
  tackleWeight: string = 'medium',
): Promise<boolean> {
  if (!isCastTrackerAvailable()) return false;
  if (state.isListening) return true;

  try {
    // Set update intervals
    Accelerometer.setUpdateInterval(CAST_TRACKER.SENSOR_UPDATE_INTERVAL_MS);
    if (Gyroscope) Gyroscope.setUpdateInterval(CAST_TRACKER.SENSOR_UPDATE_INTERVAL_MS);
    if (Magnetometer) Magnetometer.setUpdateInterval(100); // compass doesn't need 60Hz

    // Subscribe to sensors
    state.accelSubscription = Accelerometer.addListener(handleAccelData);

    if (Gyroscope) {
      state.gyroSubscription = Gyroscope.addListener(handleGyroData);
    }
    if (Magnetometer) {
      state.magSubscription = Magnetometer.addListener(handleMagData);
    }

    state.onCastDetected = onCastDetected;
    state.tackleWeight = tackleWeight;
    state.isListening = true;
    state.phase = 'idle';

    return true;
  } catch {
    return false;
  }
}

/** Stop listening for casts */
export function stopCastTracking(): void {
  if (state.accelSubscription) {
    state.accelSubscription.remove();
    state.accelSubscription = null;
  }
  if (state.gyroSubscription) {
    state.gyroSubscription.remove();
    state.gyroSubscription = null;
  }
  if (state.magSubscription) {
    state.magSubscription.remove();
    state.magSubscription = null;
  }
  state.isListening = false;
  state.onCastDetected = null;
  state.phase = 'idle';
}

/** Update the angler's current GPS position (call this on location updates) */
export function updateAnglerPosition(lat: number, lng: number): void {
  state.userLat = lat;
  state.userLng = lng;
}

/** Update tackle weight setting */
export function setTackleWeight(weight: string): void {
  state.tackleWeight = weight;
}

/** Get bearing as compass label */
export function bearingToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

/** Check if a cast estimate is stale */
export function isCastStale(cast: CastEstimate): boolean {
  return Date.now() - cast.timestamp > CAST_TRACKER.STALE_TIMEOUT_MS;
}
