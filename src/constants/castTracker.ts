// ─────────────────────────────────────────────
// NGN Fishing — Cast Guide Constants
// Compass-based cast guidance: points the angler
// toward structure and shows distance to target.
// Uses GPS + magnetometer — no guessing.
// ─────────────────────────────────────────────

export const CAST_GUIDE = {
  // ── Sensor Config ──────────────────────────
  // Magnetometer update rate — 10Hz is smooth for compass
  COMPASS_UPDATE_INTERVAL_MS: 100,

  // GPS update interval — balance accuracy vs battery
  GPS_UPDATE_INTERVAL_MS: 2000,

  // ── Distance Thresholds ────────────────────
  // Max distance (yards) at which "Guide My Cast" is offered.
  // Beyond this, you're not close enough to cast to the structure.
  MAX_CASTABLE_DISTANCE_YDS: 150,

  // Distance where guidance says "you're on top of it"
  ON_TARGET_DISTANCE_YDS: 5,

  // ── Display ────────────────────────────────
  // Arrow/compass colors
  ARROW_COLOR: '#4ECDC4',          // Seafoam — matches brand
  ARROW_ON_TARGET: '#2ECC71',      // Green when you're aimed right
  ARROW_OFF_TARGET: '#F39C12',     // Amber when you need to adjust
  DISTANCE_COLOR: '#FFFFFF',

  // How tight the aim needs to be (degrees off bearing) to show "on target"
  AIM_TOLERANCE_DEG: 15,
} as const;

// ── Cast Guide State ────────────────────────
export interface CastGuideState {
  isActive: boolean;
  targetLat: number;
  targetLng: number;
  targetName: string;
  targetDepth?: string;
  distanceYds: number;
  bearingDeg: number;           // True bearing to target (0=N)
  compassHeading: number;       // Phone's current compass heading
  aimOffsetDeg: number;         // How far off you are (bearingDeg - compassHeading)
  isAimedAtTarget: boolean;     // Within AIM_TOLERANCE_DEG
}
