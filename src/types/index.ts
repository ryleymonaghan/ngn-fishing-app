// ─────────────────────────────────────────────
// NGN Fishing — App Types
// ─────────────────────────────────────────────

import type { AccessTypeId, TimeWindowId } from '@constants/index';

// ── Location ─────────────────────────────────
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface UserLocation extends Coordinates {
  label?: string;
  noaaStation?: string;
}

// ── Conditions ───────────────────────────────
export interface TideReading {
  time: string;         // ISO string
  height: number;       // feet
  type: 'H' | 'L';     // High or Low
}

export interface TideData {
  station: string;
  predictions: TideReading[];
  currentHeight: number;
  currentTrend: 'rising' | 'falling' | 'slack';
  nextTide: TideReading;
  timeToNextTide: number; // minutes
}

export interface WeatherData {
  temp: number;          // °F
  feelsLike: number;
  windSpeed: number;     // mph
  windDirection: number; // degrees
  windCardinal: string;  // 'WSW'
  conditions: string;    // 'Mostly Sunny'
  icon: string;
  humidity: number;
  visibility: number;    // miles
  waterTemp?: number;    // °F from buoy
}

export interface BuoyData {
  stationId: string;
  waveHeightFt: number;
  swellPeriodSec: number;
  waterTempF: number;
  windSpeedKts: number;
}

export interface SolunarData {
  rating: number;        // 0–100
  label: string;         // 'Excellent' | 'Good' | 'Fair' | 'Poor'
  majorPeriods: string[];
  minorPeriods: string[];
}

// ── 3-Day Forecast ──────────────────────────
export interface DayForecast {
  date: string;          // ISO date string (YYYY-MM-DD)
  dayLabel: string;      // 'Today', 'Tomorrow', 'Wednesday'
  weather: {
    tempHigh: number;
    tempLow: number;
    windSpeed: number;
    windCardinal: string;
    conditions: string;
    icon: string;
    rainChance: number;  // 0–100
  };
  tideEvents: TideReading[];
  solunar: SolunarData;
  successProbability: number;  // 0–100 composite score
  successLabel: string;        // 'Excellent', 'Good', 'Fair', 'Poor'
}

export interface LiveConditions {
  weather: WeatherData;
  tides: TideData;
  solunar: SolunarData;
  buoy?: BuoyData;
  forecast?: DayForecast[];  // 3-day forecast
  fetchedAt: string;     // ISO string
  location: UserLocation;
}

// ── Wizard / Report Input ─────────────────────
export interface WizardDraft {
  date: string;          // ISO date string
  timeWindow: TimeWindowId;
  accessType: AccessTypeId;
  boatLengthFt?: number;
  boatSpeedMph?: number;
  species: string[];     // species IDs
  isOffshore: boolean;
  baitType: 'live' | 'frozen' | 'artificial' | 'catching_own';
  baitIds: string[];
}

// ── Fishing Spot ─────────────────────────────
export interface FishingSpot {
  id: string;
  name: string;
  coordinates: Coordinates;
  depthFt?: string;      // '5–12 ft' or '20–30 ft'
  notes: string;
  accessType: AccessTypeId[];
  arrivalTime?: string;  // '10:00 AM'
  targetSpecies?: string[];
}

// ── Rig / Tackle ─────────────────────────────
export interface RigRecommendation {
  name: string;          // 'Carolina Rig'
  hookSize?: string;     // '#1 Aberdeen'
  leader?: string;       // '15 lb fluorocarbon'
  weight?: string;       // '3/8 oz jig head'
  baitPresentation: string;
}

// ── Species Report Section ───────────────────
export interface SpeciesSection {
  speciesId: string;
  speciesName: string;
  biteWindow: string;    // '10:30 AM – 12:30 PM'
  biteWindowReasoning: string;
  spots: FishingSpot[];
  rig: RigRecommendation;
  baitRecommendation: string;
  anchoringStrategy: string;
  proTip: string;
  regulations: {
    state: string;
    sizeLimitIn: string;
    bagLimit: string;
  };
}

// ── Schedule Entry ───────────────────────────
export interface ScheduleEntry {
  time: string;          // '10:00 AM'
  species: string;
  location: string;
  tide: string;          // 'Falling (Fast)'
  rig: string;
}

// ── Full Fishing Report ───────────────────────
export interface FishingReport {
  id: string;
  generatedAt: string;   // ISO string
  conditions: LiveConditions;
  input: WizardDraft;

  // Offshore safety (only if isOffshore)
  offshoreGoNoGo?: {
    status: 'go' | 'caution' | 'no_go';
    waveHeightFt: number;
    boatLengthFt: number;
    reasoning: string;
  };

  conditionsSummary: string;
  species: SpeciesSection[];
  schedule: ScheduleEntry[];
  baitFinderTip?: string;  // Cast net / bird GPS tip
  proTips: string[];
}

// ── User / Auth ───────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  boatLengthFt: number;
  boatSpeedMph: number;
  homeStation: string;   // NOAA station ID
  reportsUsed: number;
  subscription: SubscriptionStatus;
  createdAt: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  tier: 'free' | 'monthly' | 'annual';
  expiresAt?: string;
  stripeCustomerId?: string;
}

// ── Store Slices ──────────────────────────────
export interface ConditionsStore {
  conditions: LiveConditions | null;
  isLoading: boolean;
  error: string | null;
  fetchConditions: (location: UserLocation) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface WizardStore {
  draft: WizardDraft;
  currentStep: 1 | 2 | 3;
  setStep: (step: 1 | 2 | 3) => void;
  updateDraft: (partial: Partial<WizardDraft>) => void;
  resetDraft: () => void;
}

export interface ReportStore {
  reports: FishingReport[];
  activeReport: FishingReport | null;
  isGenerating: boolean;
  error: string | null;
  generateReport: (draft: WizardDraft, conditions: LiveConditions) => Promise<void>;
  setActiveReport: (report: FishingReport) => void;
  loadHistory: () => Promise<void>;
}

export interface AuthStore {
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadUser: () => Promise<void>;
  canGenerateReport: () => boolean;
}
