// ─────────────────────────────────────────────
// NGN Fishing — App Constants
// All magic strings, numbers, and config live here.
// Never hardcode values in components or services.
// ─────────────────────────────────────────────

// ── App ──────────────────────────────────────
export const APP_NAME = 'NGN Fishing';
export const APP_TAGLINE = 'No Guide Needed';
export const APP_SLOGAN = 'Any water. Any shore. No guide needed.';
export const APP_INTRO = `A great fisherman isn't lucky. They understand the importance of practice, patience, and skill. But every day, the conditions are different. Typically the ones who know? They fish daily — they're guides. Welcome to No Guide Needed.`;
export const APP_VERSION = '0.1.0';
export const FREE_REPORT_LIMIT = 3;

// ── Brand Colors ─────────────────────────────
export const COLORS = {
  // Primary palette
  navy:        '#0A2540',
  navyLight:   '#0E3560',
  ocean:       '#1A6B8A',
  seafoam:     '#4ECDC4',
  sky:         '#87CEEB',
  white:       '#FFFFFF',
  offWhite:    '#F4F8FB',

  // Semantic
  success:     '#2ECC71',
  warning:     '#F39C12',
  danger:      '#E74C3C',
  info:        '#3498DB',

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#A8C4D4',
  textMuted:     '#6B8FA8',

  // Go/No-Go
  goGreen:     '#2ECC71',
  cautionAmber:'#F39C12',
  noGoRed:     '#E74C3C',
} as const;

// ── API Keys (read from app.config.js extra via expo-constants) ─────
import Constants from 'expo-constants';
const extra = Constants.expoConfig?.extra ?? {};

export const API_KEYS = {
  ANTHROPIC:     extra.ANTHROPIC_API_KEY     ?? '',
  OPENWEATHER:   extra.OPENWEATHER_API_KEY   ?? '',
  SUPABASE_URL:  extra.SUPABASE_URL          ?? '',
  SUPABASE_ANON: extra.SUPABASE_ANON_KEY     ?? '',
  STRIPE_PK:     extra.STRIPE_PUBLISHABLE_KEY ?? '',
} as const;

// ── External API Endpoints ────────────────────
export const API_ENDPOINTS = {
  // NOAA Tides & Currents
  NOAA_TIDES:    'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter',
  // NOAA NDBC Buoys (offshore wave/temp)
  NOAA_NDBC:     'https://www.ndbc.noaa.gov/data/realtime2',
  // OpenWeather
  OPENWEATHER:   'https://api.openweathermap.org/data/2.5',
  // Anthropic Claude
  ANTHROPIC:     'https://api.anthropic.com/v1/messages',
} as const;

// ── NOAA Tide Stations ───────────────────────
export const NOAA_STATIONS = {
  CHARLESTON_HARBOR:  '8665530',
  BEAUFORT_SC:        '8656483',
  MYRTLE_BEACH:       '8661070',
  WILMINGTON_NC:      '8658120',
  SAVANNAH:           '8670870',
  FERNANDINA_BEACH:   '8720030',
  JACKSONVILLE:       '8720218',
} as const;

// ── NOAA NDBC Buoy IDs (offshore) ────────────
export const NOAA_BUOYS = {
  CHARLESTON_OFFSHORE: '41004', // 38nm SE of Charleston
  CAPE_FEAR:           '41013',
  SAVANNAH:            '41008',
  CANAVERAL:           '41009',
} as const;

// ── Claude API Config ────────────────────────
export const CLAUDE_CONFIG = {
  MODEL:          'claude-sonnet-4-5-20250514',
  MAX_TOKENS:     4096,
  SYSTEM_PROMPT: `You are NGN Fishing — an elite AI fishing guide for the Southeast USA coast. 
You have deep knowledge of inshore and offshore fishing from NC to FL, including tides, 
species behavior, local regulations, tackle, and GPS waypoints. 
You always respond in valid JSON matching the FishingReport schema. 
Never hallucinate GPS coordinates — use real, known fishing locations only.`,
} as const;

// ── Stripe Product IDs ───────────────────────
// IMPORTANT: Replace these with real Stripe price IDs from your dashboard.
// Stripe Dashboard → Products → NGN Pro → copy the price_xxx IDs
export const STRIPE_PRODUCTS = {
  MONTHLY_PRICE_ID: 'price_1TIwxoHnXVDSXKsG8G998CNt',   // $9.99/mo
  ANNUAL_PRICE_ID:  'price_1TIx16HnXVDSXKsGkbaNo7Ay',    // $59.99/yr
} as const;

export const PRICING = {
  MONTHLY:      9.99,
  ANNUAL:       59.99,
  ANNUAL_LABEL: 'Save 50%',
} as const;

// ── Time Windows ─────────────────────────────
export const TIME_WINDOWS = [
  { id: 'morning',   label: 'Morning',       hours: '5am – 11am' },
  { id: 'midday',    label: 'Midday',         hours: '11am – 2pm' },
  { id: 'afternoon', label: 'Afternoon',      hours: '2pm – 6pm'  },
  { id: 'evening',   label: 'Evening',        hours: '6pm – Dark' },
  { id: 'full_day',  label: 'Full Day',       hours: 'Sunrise – Sunset' },
] as const;

export type TimeWindowId = typeof TIME_WINDOWS[number]['id'];

// ── Access Types ─────────────────────────────
export const ACCESS_TYPES = [
  { id: 'boat',   label: 'Boat',   icon: 'boat',   sub: 'Powerboat, center console, skiff' },
  { id: 'kayak',  label: 'Kayak',  icon: 'kayak',  sub: 'Kayak or canoe — paddle power' },
  { id: 'shore',  label: 'Shore',  icon: 'beach',  sub: 'Bank, dock, pier, jetty, bridge' },
  { id: 'surf',   label: 'Surf',   icon: 'waves',  sub: 'Beach fishing — sand, breakers' },
  { id: 'dock',   label: 'Dock',   icon: 'anchor', sub: 'Private or public dock' },
] as const;

export type AccessTypeId = typeof ACCESS_TYPES[number]['id'];

// ── Bait Delivery Methods (shore/surf only) ──
// Fly bait out to deeper water for better results
export const BAIT_DELIVERY_METHODS = [
  { id: 'cast',  label: 'Cast Only',       sub: 'Standard rod cast — no assist' },
  { id: 'drone', label: 'Drone Drop',      sub: 'Fly bait out via fishing drone' },
  { id: 'kite',  label: 'Kite',            sub: 'Kite fishing — wind-powered bait placement' },
  { id: 'kayak_ferry', label: 'Kayak Ferry', sub: 'Paddle bait out, fish from shore' },
] as const;

export type BaitDeliveryId = typeof BAIT_DELIVERY_METHODS[number]['id'];

// Access types that support bait delivery options
export const DELIVERY_ELIGIBLE_ACCESS = ['shore', 'surf'] as const;

// ── Inshore Species ──────────────────────────
export const INSHORE_SPECIES = [
  {
    id: 'flounder',
    name: 'Flounder',
    season: 'Year-round (best fall)',
    scSizeIn: 12,
    scBagLimit: 10,
    tags: ['bottom', 'inshore'],
  },
  {
    id: 'redfish',
    name: 'Red Drum (Redfish)',
    season: 'Year-round',
    scSizeIn: '15–23" slot',
    scBagLimit: 3,
    tags: ['flats', 'inshore'],
  },
  {
    id: 'speckled_trout',
    name: 'Speckled Trout',
    season: 'Year-round (best winter)',
    scSizeIn: 14,
    scBagLimit: 10,
    tags: ['structure', 'inshore'],
  },
  {
    id: 'sheepshead',
    name: 'Sheepshead',
    season: 'Year-round (best spring)',
    scSizeIn: 10,
    scBagLimit: 10,
    tags: ['structure', 'inshore'],
  },
  {
    id: 'black_drum',
    name: 'Black Drum',
    season: 'Year-round',
    scSizeIn: 14,
    scBagLimit: 5,
    tags: ['bottom', 'inshore'],
  },
  {
    id: 'tarpon',
    name: 'Tarpon',
    season: 'Spring–Fall',
    scSizeIn: 'Catch & Release',
    scBagLimit: 0,
    tags: ['flats', 'inshore', 'trophy'],
  },
  {
    id: 'cobia',
    name: 'Cobia',
    season: 'Spring migration',
    scSizeIn: 33,
    scBagLimit: 2,
    tags: ['nearshore', 'inshore'],
  },
  {
    id: 'spanish_mackerel',
    name: 'Spanish Mackerel',
    season: 'Spring–Fall',
    scSizeIn: 12,
    scBagLimit: 15,
    tags: ['nearshore', 'inshore'],
  },
  {
    id: 'king_mackerel',
    name: 'King Mackerel',
    season: 'Spring–Fall',
    scSizeIn: 24,
    scBagLimit: 3,
    tags: ['nearshore', 'inshore'],
  },
  {
    id: 'bull_shark',
    name: 'Bull Shark',
    season: 'Year-round',
    scSizeIn: null,
    scBagLimit: null,
    tags: ['inshore', 'trophy'],
  },
] as const;

// ── Offshore Species ─────────────────────────
export const OFFSHORE_SPECIES = [
  { id: 'mahi',        name: 'Mahi-Mahi',       season: 'Spring–Fall',    tags: ['pelagic', 'offshore'] },
  { id: 'wahoo',       name: 'Wahoo',            season: 'Year-round',     tags: ['pelagic', 'offshore'] },
  { id: 'yellowfin',   name: 'Yellowfin Tuna',   season: 'Year-round',     tags: ['pelagic', 'offshore'] },
  { id: 'blackfin',    name: 'Blackfin Tuna',    season: 'Year-round',     tags: ['pelagic', 'offshore'] },
  { id: 'gag_grouper', name: 'Gag Grouper',      season: 'Year-round',     tags: ['bottom', 'offshore'] },
  { id: 'red_snapper', name: 'Red Snapper',      season: 'Limited season', tags: ['bottom', 'offshore'] },
  { id: 'amberjack',   name: 'Amberjack',        season: 'Year-round',     tags: ['structure', 'offshore'] },
  { id: 'sailfish',    name: 'Sailfish',          season: 'Winter–Spring',  tags: ['pelagic', 'offshore', 'trophy'] },
] as const;

// ── Special Packages ─────────────────────────
export const SPECIAL_PACKAGES = [
  {
    id: 'lowcountry_grand_slam',
    name: 'Lowcountry Grand Slam',
    species: ['flounder', 'sheepshead', 'redfish', 'speckled_trout'],
    description: 'The full Lowcountry day — 4 species, one tide cycle.',
  },
] as const;

// ── Live Bait Options ────────────────────────
export const LIVE_BAIT = [
  { id: 'live_shrimp',    name: 'Live Shrimp',      inshore: true,  offshore: false },
  { id: 'finger_mullet',  name: 'Finger Mullet',    inshore: true,  offshore: true  },
  { id: 'mud_minnow',     name: 'Mud Minnow',       inshore: true,  offshore: false },
  { id: 'fiddler_crab',   name: 'Fiddler Crab',     inshore: true,  offshore: false },
  { id: 'blue_crab',      name: 'Blue Crab',        inshore: true,  offshore: false },
  { id: 'pinfish',        name: 'Pinfish',           inshore: true,  offshore: true  },
  { id: 'live_pogies',    name: 'Live Pogies (Menhaden)', inshore: true,  offshore: true  },
] as const;

export const FROZEN_BAIT = [
  { id: 'frozen_shrimp',  name: 'Frozen Shrimp',   inshore: true,  offshore: false },
  { id: 'frozen_mullet',  name: 'Frozen Mullet',   inshore: true,  offshore: true  },
  { id: 'menhaden',       name: 'Menhaden (Pogies)', inshore: true, offshore: true  },
  { id: 'squid',          name: 'Squid',            inshore: false, offshore: true  },
  { id: 'ballyhoo',       name: 'Ballyhoo',         inshore: false, offshore: true  },
  { id: 'rigged_mullet',  name: 'Rigged Mullet',   inshore: false, offshore: true  },
] as const;

export const ARTIFICIAL_BAIT = [
  { id: 'soft_plastic',   name: 'Soft Plastics (Gulp/DOA)',  inshore: true,  offshore: false },
  { id: 'gold_spoon',     name: 'Gold Johnson Spoon',         inshore: true,  offshore: false },
  { id: 'topwater',       name: 'Topwater Plug',             inshore: true,  offshore: false },
  { id: 'jig',            name: 'Bucktail / Jig',            inshore: true,  offshore: true  },
  { id: 'mirrolure',      name: 'Mirrolure (Slow-Sink)',      inshore: true,  offshore: false },
  { id: 'popping_cork',   name: 'Popping Cork Rig',          inshore: true,  offshore: false },
] as const;

// ── Go/No-Go Offshore Safety Thresholds ──────
export const OFFSHORE_SAFETY = {
  // Wave height (ft) vs boat length (ft) thresholds
  GO_RATIO:      0.10,  // wave ≤ 10% of boat length = GO
  CAUTION_RATIO: 0.18,  // wave ≤ 18% = CAUTION
  // Above CAUTION_RATIO = NO GO
  MIN_BOAT_LENGTH_FT: 18,
  DEFAULT_BOAT_LENGTH_FT: 24,
  DEFAULT_BOAT_SPEED_MPH: 25,
} as const;

// ── Solunar Rating Labels ─────────────────────
export const SOLUNAR_RATINGS = {
  EXCELLENT: { label: 'Excellent', min: 80, color: COLORS.success   },
  GOOD:      { label: 'Good',      min: 60, color: COLORS.seafoam   },
  FAIR:      { label: 'Fair',      min: 40, color: COLORS.warning   },
  POOR:      { label: 'Poor',      min: 0,  color: COLORS.textMuted },
} as const;

// ── Alert Message Templates ──────────────────
export const ALERT_TEMPLATES = {
  MOVE_NOW:    (dest: string, mins: number) =>
    `Leave now — ${mins} min to ${dest} to make peak bite window`,
  TIDE_CHANGE: (type: string, mins: number) =>
    `${type} tide in ${mins} min — position now`,
  BITE_WINDOW: (species: string, location: string) =>
    `${species} bite window open at ${location}`,
} as const;

// ── Navigation Routes ─────────────────────────
export const ROUTES = {
  TABS: {
    HOME:    '/(tabs)/',
    REPORTS: '/(tabs)/reports',
    SPOTS:   '/(tabs)/spots',
    PROFILE: '/(tabs)/profile',
  },
  WIZARD: {
    STEP_1: '/wizard/step1',
    STEP_2: '/wizard/step2',
    STEP_3: '/wizard/step3',
  },
  REPORT: '/report/[id]',
} as const;

// ── Map & UI Config ─────────────────────────
export const MAP_CONFIG = {
  DRAWER_WIDTH:            260,
  ANIMATION_DURATION_MS:   220,
  DEFAULT_MAP_DELTA:       0.15,
  WIDE_MAP_DELTA:          0.3,
  PIN_DROP_DELTA:          0.5,
  MAX_ZOOM_PRO:            17,
  MAX_ZOOM_FREE:           10,
  TILE_SIZE:               256,
} as const;

// ── Photo Config ─────────────────────────────
export const PHOTO_CONFIG = {
  QUALITY:        0.85,
  ASPECT_RATIO:   [4, 3] as const,
  GRID_PADDING:   36,
} as const;

// ── Report Config ────────────────────────────
export const REPORT_CONFIG = {
  MAX_TOKENS:              8192,
  HISTORY_LIMIT:           50,
  FORECAST_DAYS:           7,
  COORD_PRECISION:         4,
  REPORT_GEN_ESTIMATE:     '15–20 seconds',
} as const;

// ── Geolocation Config ──────────────────────
export const GEO_CONFIG = {
  TIMEOUT_MS:              10000,
  LOCATION_REFETCH_DEG:    0.1,
} as const;

// ── Weather Alert Thresholds ─────────────────
export const WEATHER_THRESHOLDS = {
  HIGH_WIND_MPH:           20,
  SMALL_CRAFT_WIND_MPH:    25,
  GALE_WIND_MPH:           30,
  HIGH_RAIN_PCT:           80,
  CALM_WIND_MPH:           10,
  LIGHTNING_KEYWORDS:      ['thunderstorm', 'lightning', 'severe'] as const,
} as const;

// ── Notification Config ──────────────────────
export const NOTIFICATION_CONFIG = {
  HEADS_UP_MINUTES:        15,
  TIDE_ALERT_MINUTES:      20,
  CHANNEL_NAME:            'move-alerts',
} as const;

// ── Affiliate Config ─────────────────────────
export const AFFILIATE_CONFIG = {
  AMAZON_TAG:              'ngnfishing-20',
} as const;

// ── Community Links ──────────────────────────
export const COMMUNITY_LINKS = {
  FACEBOOK:  'https://www.facebook.com/groups/ngnfishing',
  INSTAGRAM: 'https://www.instagram.com/ngnfishing',
  WEBSITE:   'https://ngnfishing.com',
} as const;

// ── Async Storage Keys ───────────────────────
export const STORAGE_KEYS = {
  AUTH_TOKEN:       'ngn:auth_token',
  USER_PROFILE:     'ngn:user_profile',
  REPORT_HISTORY:   'ngn:report_history',
  REPORTS_USED:     'ngn:reports_used',
  BOAT_LENGTH:      'ngn:boat_length',
  BOAT_SPEED:       'ngn:boat_speed',
  LAST_LOCATION:    'ngn:last_location',
  WIZARD_DRAFT:     'ngn:wizard_draft',
  SUBSCRIPTION:     'ngn:subscription',
} as const;

// ── Default Location (Johns Island / Charleston) ──
export const DEFAULT_LOCATION = {
  lat:    32.7488,
  lng:   -80.0228,
  label: 'Johns Island, SC',
  noaaStation: '8665530',
} as const;

// ── Fishing Location Presets (SE USA coverage) ───
export interface FishingLocationPreset {
  id: string;
  label: string;
  region: string;
  lat: number;
  lng: number;
  noaaStation: string;
}

export const FISHING_LOCATIONS: FishingLocationPreset[] = [
  // South Carolina
  { id: 'charleston',      label: 'Charleston / Johns Island',   region: 'SC', lat: 32.7488,  lng: -80.0228, noaaStation: '8665530' },
  { id: 'mt_pleasant',     label: 'Mt. Pleasant / Shem Creek',   region: 'SC', lat: 32.7876,  lng: -79.8643, noaaStation: '8665530' },
  { id: 'folly_beach',     label: 'Folly Beach',                 region: 'SC', lat: 32.6552,  lng: -79.9403, noaaStation: '8665530' },
  { id: 'isle_of_palms',   label: 'Isle of Palms / Sullivans',   region: 'SC', lat: 32.7866,  lng: -79.7545, noaaStation: '8665530' },
  { id: 'kiawah',          label: 'Kiawah / Seabrook Island',    region: 'SC', lat: 32.6082,  lng: -80.0820, noaaStation: '8665530' },
  { id: 'edisto',          label: 'Edisto Beach / Island',        region: 'SC', lat: 32.4874,  lng: -80.3024, noaaStation: '8665530' },
  { id: 'hilton_head',     label: 'Hilton Head / Port Royal',     region: 'SC', lat: 32.2163,  lng: -80.7526, noaaStation: '8667633' },
  { id: 'beaufort',        label: 'Beaufort / Lady\'s Island',    region: 'SC', lat: 32.4316,  lng: -80.6698, noaaStation: '8667633' },
  { id: 'myrtle_beach',    label: 'Myrtle Beach',                region: 'SC', lat: 33.6891,  lng: -78.8867, noaaStation: '8661070' },
  { id: 'pawleys',         label: 'Pawleys Island / Litchfield', region: 'SC', lat: 33.4271,  lng: -79.1256, noaaStation: '8661070' },
  { id: 'georgetown',      label: 'Georgetown / Winyah Bay',     region: 'SC', lat: 33.3668,  lng: -79.2948, noaaStation: '8661070' },
  { id: 'mcclellanville',  label: 'McClellanville / Cape Romain',region: 'SC', lat: 33.0846,  lng: -79.4617, noaaStation: '8665530' },
  // North Carolina
  { id: 'wilmington',      label: 'Wilmington / Wrightsville',   region: 'NC', lat: 34.2104,  lng: -77.7963, noaaStation: '8658120' },
  { id: 'carolina_beach',  label: 'Carolina Beach / Kure',       region: 'NC', lat: 34.0352,  lng: -77.8936, noaaStation: '8658120' },
  { id: 'southport',       label: 'Southport / Oak Island',      region: 'NC', lat: 33.9215,  lng: -78.0175, noaaStation: '8658120' },
  { id: 'outer_banks',     label: 'Outer Banks / Hatteras',      region: 'NC', lat: 35.2316,  lng: -75.5475, noaaStation: '8654467' },
  { id: 'morehead',        label: 'Morehead City / Beaufort NC', region: 'NC', lat: 34.7185,  lng: -76.7261, noaaStation: '8656483' },
  // Georgia
  { id: 'savannah',        label: 'Savannah / Tybee Island',     region: 'GA', lat: 32.0835,  lng: -81.0998, noaaStation: '8670870' },
  { id: 'st_simons',       label: 'St. Simons / Jekyll Island',  region: 'GA', lat: 31.1506,  lng: -81.3690, noaaStation: '8677344' },
  // Florida (NE)
  { id: 'jax_beach',       label: 'Jacksonville Beach',          region: 'FL', lat: 30.2947,  lng: -81.3931, noaaStation: '8720218' },
  { id: 'st_augustine',    label: 'St. Augustine',               region: 'FL', lat: 29.8947,  lng: -81.3145, noaaStation: '8720587' },
  { id: 'daytona',         label: 'Daytona Beach',               region: 'FL', lat: 29.2108,  lng: -81.0228, noaaStation: '8721120' },
  { id: 'cocoa_beach',     label: 'Cocoa Beach / Cape Canaveral',region: 'FL', lat: 28.3200,  lng: -80.6076, noaaStation: '8721604' },
  { id: 'stuart',          label: 'Stuart / Jensen Beach',        region: 'FL', lat: 27.1976,  lng: -80.2528, noaaStation: '8722125' },
];

// Group locations by region for the picker
export const LOCATION_REGIONS = ['SC', 'NC', 'GA', 'FL'] as const;

// ── 5-Day Species Forecast ──────────────────────
import type { ForecastCategoryId } from '@app-types/index';

export const FORECAST_DAYS = 5;

// 12-month activity factor per species (index 0 = January, 11 = December)
// Derived from each species' season field + SE USA fishing knowledge
export const SPECIES_SEASONALITY: Record<string, number[]> = {
  // Inshore
  flounder:         [0.4, 0.4, 0.5, 0.6, 0.7, 0.7, 0.7, 0.7, 0.9, 1.0, 0.8, 0.5],
  redfish:          [0.7, 0.7, 0.8, 0.8, 0.8, 0.8, 0.8, 0.9, 1.0, 1.0, 0.8, 0.7],
  speckled_trout:   [1.0, 1.0, 0.8, 0.6, 0.5, 0.4, 0.4, 0.5, 0.6, 0.7, 0.9, 1.0],
  sheepshead:       [0.6, 0.7, 1.0, 1.0, 0.8, 0.5, 0.4, 0.4, 0.5, 0.6, 0.6, 0.6],
  black_drum:       [0.7, 0.7, 0.8, 0.8, 0.7, 0.6, 0.6, 0.6, 0.7, 0.8, 0.7, 0.7],
  tarpon:           [0.0, 0.0, 0.2, 0.5, 0.8, 1.0, 1.0, 1.0, 0.8, 0.5, 0.1, 0.0],
  cobia:            [0.0, 0.1, 0.5, 1.0, 1.0, 0.7, 0.3, 0.1, 0.0, 0.0, 0.0, 0.0],
  spanish_mackerel: [0.0, 0.0, 0.3, 0.7, 1.0, 1.0, 1.0, 0.9, 0.7, 0.4, 0.1, 0.0],
  king_mackerel:    [0.0, 0.0, 0.3, 0.6, 0.9, 1.0, 1.0, 0.9, 0.7, 0.4, 0.1, 0.0],
  bull_shark:       [0.5, 0.5, 0.6, 0.7, 0.8, 1.0, 1.0, 1.0, 0.8, 0.7, 0.5, 0.5],
  // Offshore
  mahi:             [0.0, 0.1, 0.3, 0.6, 1.0, 1.0, 1.0, 0.8, 0.6, 0.3, 0.1, 0.0],
  wahoo:            [0.6, 0.6, 0.7, 0.7, 0.8, 0.8, 0.8, 0.8, 0.8, 0.7, 0.7, 0.6],
  yellowfin:        [0.7, 0.7, 0.7, 0.7, 0.8, 0.8, 0.8, 0.8, 0.7, 0.7, 0.7, 0.7],
  blackfin:         [0.7, 0.7, 0.7, 0.7, 0.8, 0.8, 0.8, 0.8, 0.7, 0.7, 0.7, 0.7],
  gag_grouper:      [0.7, 0.7, 0.7, 0.7, 0.8, 0.8, 0.8, 0.7, 0.7, 0.7, 0.7, 0.7],
  red_snapper:      [0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  amberjack:        [0.7, 0.7, 0.7, 0.8, 0.9, 0.9, 0.9, 0.9, 0.8, 0.7, 0.7, 0.7],
  sailfish:         [0.8, 0.9, 1.0, 0.9, 0.6, 0.3, 0.1, 0.1, 0.2, 0.4, 0.6, 0.8],
};

export const FORECAST_CATEGORIES: { id: ForecastCategoryId; name: string; speciesIds: string[] }[] = [
  {
    id: 'inshore',
    name: 'Inshore',
    speciesIds: ['flounder', 'redfish', 'speckled_trout', 'sheepshead', 'black_drum',
                 'tarpon', 'cobia', 'spanish_mackerel', 'king_mackerel', 'bull_shark'],
  },
  {
    id: 'offshore_trolling',
    name: 'Offshore Trolling',
    speciesIds: ['mahi', 'wahoo', 'yellowfin', 'blackfin', 'sailfish'],
  },
  {
    id: 'offshore_reef',
    name: 'Offshore Reef & Bottom',
    speciesIds: ['gag_grouper', 'red_snapper', 'amberjack'],
  },
];
