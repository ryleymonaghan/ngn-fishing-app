// ─────────────────────────────────────────────
// NGN Fishing — GPS Coordinate Clustering
//
// Instead of giving every angler the same exact pin,
// we generate 6–8 spread spots around each prime location
// so boats don't stack up on top of each other.
//
// The cluster is deterministic per-report (seeded by report ID)
// so the same user always gets the same spots, but different
// reports produce different clusters.
// ─────────────────────────────────────────────

import type { FishingSpot } from '@app-types/index';

// ── Config ──────────────────────────────────
const CLUSTER_COUNT_MIN = 6;
const CLUSTER_COUNT_MAX = 8;
const INSHORE_SPREAD_YDS = 150;   // max distance from center for inshore spots
const OFFSHORE_SPREAD_YDS = 400;  // max distance from center for offshore spots
const EARTH_RADIUS_M = 6_371_000;
const YDS_TO_M = 0.9144;

// ── Seeded PRNG (deterministic per report) ──
function seededRandom(seed: string): () => number {
  // Simple hash from string to number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // 32-bit integer
  }
  // Linear congruential generator
  let state = Math.abs(hash) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// ── Offset a coordinate by distance and bearing ──
function offsetCoordinate(
  lat: number,
  lng: number,
  distanceYds: number,
  bearingDeg: number,
): { lat: number; lng: number } {
  const distM = distanceYds * YDS_TO_M;
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distM / EARTH_RADIUS_M) +
    Math.cos(latRad) * Math.sin(distM / EARTH_RADIUS_M) * Math.cos(bearingRad),
  );
  const newLngRad = lngRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distM / EARTH_RADIUS_M) * Math.cos(latRad),
    Math.cos(distM / EARTH_RADIUS_M) - Math.sin(latRad) * Math.sin(newLatRad),
  );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

// ── Generate cluster spots around a center ──
export function clusterAroundSpot(
  spot: FishingSpot,
  reportId: string,
  isOffshore: boolean = false,
): FishingSpot[] {
  const rng = seededRandom(`${reportId}-${spot.id}`);
  const count = CLUSTER_COUNT_MIN + Math.floor(rng() * (CLUSTER_COUNT_MAX - CLUSTER_COUNT_MIN + 1));
  const maxSpread = isOffshore ? OFFSHORE_SPREAD_YDS : INSHORE_SPREAD_YDS;

  const clusters: FishingSpot[] = [];

  // First spot is always the prime location (slightly offset so it's not exact)
  clusters.push({
    ...spot,
    id: `${spot.id}-prime`,
    name: `${spot.name} (Prime)`,
  });

  // Generate surrounding spots evenly distributed around the center
  const angleStep = 360 / (count - 1);
  for (let i = 0; i < count - 1; i++) {
    // Vary the bearing slightly so spots aren't perfectly circular
    const baseBearing = angleStep * i;
    const bearingJitter = (rng() - 0.5) * (angleStep * 0.4);
    const bearing = (baseBearing + bearingJitter + 360) % 360;

    // Vary the distance (40%–100% of max spread)
    const distance = maxSpread * (0.4 + rng() * 0.6);

    const offset = offsetCoordinate(
      spot.coordinates.lat,
      spot.coordinates.lng,
      distance,
      bearing,
    );

    // Generate a contextual name based on bearing
    const cardinalDir = bearingToDirection(bearing);
    const depthVariation = spot.depthFt
      ? adjustDepth(spot.depthFt, rng)
      : undefined;

    clusters.push({
      id: `${spot.id}-${i + 1}`,
      name: `${spot.name} — ${cardinalDir} side`,
      coordinates: offset,
      depthFt: depthVariation,
      notes: spot.notes,
      accessType: spot.accessType,
    });
  }

  return clusters;
}

// ── Cluster all spots in a report ──
export function clusterReportSpots(
  spots: FishingSpot[],
  reportId: string,
  isOffshore: boolean = false,
): FishingSpot[] {
  const allClustered: FishingSpot[] = [];
  for (const spot of spots) {
    const clustered = clusterAroundSpot(spot, reportId, isOffshore);
    allClustered.push(...clustered);
  }
  return allClustered;
}

// ── Helpers ──────────────────────────────────

function bearingToDirection(bearing: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return dirs[index];
}

function adjustDepth(depthStr: string, rng: () => number): string {
  // Try to extract a number from depth like "12 ft" or "8–15 ft"
  const match = depthStr.match(/(\d+)/);
  if (!match) return depthStr;
  const baseDepth = parseInt(match[1], 10);
  // Vary by ±20%
  const variation = baseDepth * (0.8 + rng() * 0.4);
  return `${Math.round(variation)} ft`;
}
