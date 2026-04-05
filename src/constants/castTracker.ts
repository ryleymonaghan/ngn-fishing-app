// ─────────────────────────────────────────────
// NGN Fishing — Cast Tracker Constants
// Software-based rig position estimation using
// device accelerometer + gyroscope.
// No hardware required — pure sensor math.
// ─────────────────────────────────────────────

// ── Detection Thresholds ─────────────────────
// Cast detection: a fishing cast produces a sharp
// forward acceleration spike followed by a decel.
// These thresholds were tuned for typical overhead
// and sidearm casting motions.

export const CAST_TRACKER = {
  // Sensor sample rate (Hz) — 60 samples/sec gives
  // ~16ms resolution, plenty for detecting a 0.3-0.5s cast
  SENSOR_UPDATE_INTERVAL_MS: 16,

  // Minimum total acceleration (m/s²) to start tracking a cast motion.
  // Normal holding = ~9.8 (gravity). A cast spike hits 25-50+ m/s².
  // We trigger at 18 to filter out walking, rocking on a boat, etc.
  CAST_ACCEL_TRIGGER: 18,

  // After triggering, the cast must return below this within CAST_WINDOW_MS
  // to be considered a valid cast (not just shaking the phone).
  CAST_ACCEL_SETTLE: 12,

  // Max time (ms) between trigger and settle for a valid cast.
  // A real cast is 200-600ms from backswing to release.
  CAST_WINDOW_MS: 800,

  // Minimum time between casts (ms) — debounce rapid false positives
  CAST_COOLDOWN_MS: 3000,

  // ── Distance Estimation ──────────────────────
  // Distance = f(peak_acceleration, cast_duration, tackle_weight)
  // This is a rough model — not physics-perfect, but practical.
  // Calibrated from typical surf/inshore casting distances.

  // Base distance multiplier (yards per m/s² of peak accel above trigger)
  // A moderate cast (~25 m/s² peak) should estimate ~30-40 yards.
  // A strong surf cast (~45 m/s² peak) should estimate ~80-100 yards.
  DISTANCE_BASE_MULTIPLIER: 3.2,

  // Weight adjustment factors (heavier = less distance for same force)
  WEIGHT_FACTORS: {
    light:  1.15,   // < 1oz — jig heads, small lures
    medium: 1.0,    // 1-3oz — standard rigs
    heavy:  0.80,   // 3-6oz — surf sinkers, drone rigs
    extra:  0.60,   // 6oz+ — heavy surf/shark rigs
  } as Record<string, number>,

  // Max plausible cast distance (yards) — anything above this is sensor noise
  MAX_CAST_DISTANCE_YDS: 200,

  // Min plausible cast distance (yards) — below this, probably not a real cast
  MIN_CAST_DISTANCE_YDS: 5,

  // ── Direction Estimation ─────────────────────
  // Uses gyroscope rotation data to estimate the direction of the cast
  // relative to the device's compass heading at release.

  // Gyroscope threshold (rad/s) for detecting rotational motion during cast
  GYRO_ROTATION_THRESHOLD: 1.5,

  // ── Map Display ──────────────────────────────
  // How the estimated rig position shows on the map

  // Accuracy radius circle (yards) — shows uncertainty zone
  ACCURACY_RADIUS_NEAR_YDS: 10,    // < 30 yards cast
  ACCURACY_RADIUS_MID_YDS: 20,     // 30-80 yards
  ACCURACY_RADIUS_FAR_YDS: 35,     // > 80 yards

  // Colors for the rig position marker
  MARKER_COLOR: '#FF6B35',         // Bright orange — visible on any basemap
  MARKER_ACCURACY_COLOR: '#FF6B3533', // 20% opacity orange for accuracy circle
  MARKER_ACTIVE_COLOR: '#FF6B35',
  MARKER_STALE_COLOR: '#FF6B3566', // Dimmed when rig hasn't moved in a while

  // How long before a cast position is considered "stale" (ms)
  STALE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
} as const;

// ── Tackle Weight Options ────────────────────
export interface TackleWeightOption {
  id: string;
  label: string;
  description: string;
  factor: number;
}

export const TACKLE_WEIGHTS: TackleWeightOption[] = [
  { id: 'light',  label: 'Light',       description: 'Jig heads, small lures (< 1oz)',  factor: CAST_TRACKER.WEIGHT_FACTORS.light  },
  { id: 'medium', label: 'Medium',      description: 'Standard rigs (1-3oz)',            factor: CAST_TRACKER.WEIGHT_FACTORS.medium },
  { id: 'heavy',  label: 'Heavy',       description: 'Surf sinkers (3-6oz)',             factor: CAST_TRACKER.WEIGHT_FACTORS.heavy  },
  { id: 'extra',  label: 'Extra Heavy', description: 'Shark / heavy surf (6oz+)',        factor: CAST_TRACKER.WEIGHT_FACTORS.extra  },
];

// ── Cast Result Interface ────────────────────
export interface CastEstimate {
  id: string;
  timestamp: number;             // Date.now()
  userLat: number;               // Angler's GPS position at time of cast
  userLng: number;
  estimatedLat: number;          // Where the rig likely landed
  estimatedLng: number;
  estimatedDistanceYds: number;  // Straight-line distance
  estimatedBearing: number;      // Compass degrees (0=N, 90=E, 180=S, 270=W)
  peakAcceleration: number;      // m/s² recorded during cast
  tackleWeight: string;          // 'light' | 'medium' | 'heavy' | 'extra'
  accuracyRadiusYds: number;     // Uncertainty zone
  isStale: boolean;              // True after STALE_TIMEOUT_MS
}
