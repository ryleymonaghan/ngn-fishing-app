// ─────────────────────────────────────────────
// NGN Fishing — App Types
// ─────────────────────────────────────────────

import type { AccessTypeId, TimeWindowId, BaitDeliveryId } from '@constants/index';

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

// ── Species Forecast (per-species, per-day) ──
export interface SpeciesForecast {
  speciesId: string;
  speciesName: string;
  catchProbability: number;    // 0-100
  probabilityLabel: string;    // 'Excellent' | 'Good' | 'Fair' | 'Poor'
  factors: {
    season: number;            // 0-100 contribution
    solunar: number;
    tide: number;
    weather: number;
  };
}

// ── Category grouping ──
export type ForecastCategoryId = 'inshore' | 'offshore_trolling' | 'offshore_reef';

export interface CategoryForecast {
  categoryId: ForecastCategoryId;
  categoryName: string;        // 'Inshore', 'Offshore Trolling', 'Offshore Reef'
  topScore: number;            // best species score in category
  species: SpeciesForecast[];
}

// ── Full daily species forecast ──
export interface DailyFishingForecast {
  date: string;                // YYYY-MM-DD
  dayLabel: string;            // 'Today', 'Tomorrow', 'Wednesday'
  overallScore: number;        // 0-100 avg of top species
  overallLabel: string;
  categories: CategoryForecast[];
  weather: DayForecast['weather'];
  solunar: SolunarData;
  tideEvents: TideReading[];
}

// ── Forecast Store ──
export interface ForecastStore {
  forecasts: DailyFishingForecast[];
  selectedDay: number;         // index into forecasts[]
  isLoading: boolean;
  error: string | null;
  fetchForecast: (location: UserLocation) => Promise<void>;
  setSelectedDay: (index: number) => void;
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
  baitDeliveryMethod?: BaitDeliveryId;  // shore/surf only — drone, kite, kayak ferry, or standard cast
  fishingLocation?: {    // Where the user intends to fish (overrides phone GPS)
    lat: number;
    lng: number;
    label: string;       // 'Charleston, SC' or 'Myrtle Beach, SC'
  };
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
  knotName?: string;     // 'Palomar Knot' — recommended knot for this rig
  knotId?: string;       // 'palomar' — links to knot guide
  tackleList?: string[]; // Full list of tackle items needed for this rig
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
  tier: 'free' | 'pro_monthly' | 'pro_annual' | 'angler_monthly' | 'angler_annual';
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

// ── Community (Pro Angler) ───────────────────
export type PinType = 'bait' | 'fishing';

export interface ChatMessage {
  id: string;
  user_id: string;
  display_name: string;
  message: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface LivePin {
  id: string;
  user_id: string;
  display_name: string;
  lat: number;
  lng: number;
  pin_type: PinType;
  description?: string;
  species_tag?: string;
  created_at: string;
  expires_at: string;
}

export interface CommunityStore {
  // Chat
  messages: ChatMessage[];
  isLoadingChat: boolean;
  sendMessage: (text: string, lat: number, lng: number) => Promise<void>;
  fetchNearbyChat: (lat: number, lng: number) => Promise<void>;

  // Pins
  pins: LivePin[];
  isLoadingPins: boolean;
  dropPin: (pin: Omit<LivePin, 'id' | 'created_at' | 'expires_at'>) => Promise<void>;
  removePin: (pinId: string) => Promise<void>;
  fetchNearbyPins: (lat: number, lng: number) => Promise<void>;

  // Realtime
  subscribeRealtime: (lat: number, lng: number) => void;
  unsubscribeRealtime: () => void;
}
