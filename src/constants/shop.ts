// ─────────────────────────────────────────────
// NGN Fishing — Shop / Gear Catalog
// Affiliate commerce — contextual gear recommendations.
// Every product links to a partner retailer via affiliate tracking.
// ─────────────────────────────────────────────

// ── Affiliate Partner Config ─────────────────
export interface AffiliatePartner {
  id: string;
  name: string;
  baseUrl: string;
  affiliateTag: string;   // appended to URLs for tracking
  commission: string;     // display only
  logo?: string;          // future: partner logo asset
}

export const AFFILIATE_PARTNERS: AffiliatePartner[] = [
  {
    id: 'bass_pro',
    name: 'Bass Pro Shops',
    baseUrl: 'https://www.basspro.com',
    affiliateTag: 'ngnfishing-20', // REPLACE with real affiliate tag
    commission: '5-7%',
  },
  {
    id: 'sportsmans',
    name: "Sportsman's Warehouse",
    baseUrl: 'https://www.sportsmans.com',
    affiliateTag: 'ngnfishing', // REPLACE with real affiliate tag
    commission: '5-6%',
  },
  {
    id: 'tackle_direct',
    name: 'Tackle Direct',
    baseUrl: 'https://www.tackledirect.com',
    affiliateTag: 'ngnfishing', // REPLACE with real affiliate tag
    commission: '6-8%',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    baseUrl: 'https://www.amazon.com',
    affiliateTag: 'ngnfishing-20', // REPLACE with real Amazon Associates tag
    commission: '4%',
  },
];

// ── Product Categories ───────────────────────
export interface ShopCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: 'rods',       label: 'Rods',            icon: '🎣', description: 'Spinning, casting, surf, fly, trolling' },
  { id: 'reels',      label: 'Reels',           icon: '⚙️', description: 'Spinning, baitcasting, conventional' },
  { id: 'line',       label: 'Line & Leader',   icon: '🧵', description: 'Braid, mono, fluorocarbon, wire' },
  { id: 'terminal',   label: 'Terminal Tackle',  icon: '🪝', description: 'Hooks, sinkers, swivels, snaps, jigs' },
  { id: 'lures',      label: 'Lures & Plastics', icon: '🐟', description: 'Soft plastics, spoons, topwater, plugs' },
  { id: 'electronics', label: 'Electronics',     icon: '📡', description: 'Fish finders, GPS, trolling motors' },
  { id: 'apparel',    label: 'Apparel',          icon: '👕', description: 'UV shirts, rain gear, waders, hats' },
  { id: 'accessories', label: 'Accessories',     icon: '🧰', description: 'Tackle boxes, pliers, grips, coolers' },
  { id: 'bait',       label: 'Bait & Scent',    icon: '🦐', description: 'Frozen bait, attractants, cast nets' },
  { id: 'kayak_gear', label: 'Kayak Gear',      icon: '🛶', description: 'Kayak crates, rod holders, anchors' },
  { id: 'surf_gear',  label: 'Surf & Shore',    icon: '🏖️', description: 'Sand spikes, surf carts, long-range rods' },
  { id: 'drone_kite', label: 'Drone & Kite',    icon: '🪁', description: 'Fishing drones, kites, release clips' },
];

// ── Product Listings ─────────────────────────
// Each product can have multiple affiliate links (one per partner).
// The app shows the best available partner.
export interface ShopProduct {
  id: string;
  name: string;
  brand: string;
  category: string;       // matches ShopCategory.id
  priceRange: string;     // "$15-25" display string
  description: string;
  accessTypes: string[];  // which fishing styles this is for
  species?: string[];     // species IDs this product targets
  rigId?: string;         // links to rig guide (e.g. 'carolina_rig')
  knotId?: string;        // links to knot guide
  tags: string[];         // searchable tags
  affiliateLinks: {       // partner → search/product URL
    partnerId: string;
    url: string;          // product or search results URL
  }[];
  featured?: boolean;     // show in featured section
}

// ── Curated Products ─────────────────────────
// These are hand-picked to match AI report recommendations.
// URLs use search queries so they stay current as inventory changes.
export const SHOP_PRODUCTS: ShopProduct[] = [
  // ── TERMINAL TACKLE ────────────────────
  {
    id: 'circle_hooks_1_0',
    name: '1/0 Circle Hooks (25 pack)',
    brand: 'Owner / Gamakatsu',
    category: 'terminal',
    priceRange: '$6-12',
    description: 'The most recommended hook in NGN reports. Essential for catch-and-release with live bait. The circle hook rotates into the jaw corner — never gut-hooks a fish.',
    accessTypes: ['boat', 'kayak', 'shore', 'surf', 'dock'],
    species: ['redfish', 'flounder', 'black_drum', 'sheepshead'],
    rigId: 'carolina_rig',
    tags: ['circle hook', 'live bait', 'bottom fishing', 'inshore'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/circle-hooks?q=1%2F0+circle+hook' },
      { partnerId: 'amazon', url: '/s?k=1%2F0+circle+hooks+saltwater' },
    ],
    featured: true,
  },
  {
    id: 'egg_sinkers',
    name: 'Egg Sinkers Assortment (1/4 - 1 oz)',
    brand: 'Various',
    category: 'terminal',
    priceRange: '$5-10',
    description: 'Slide-through design for Carolina rigs and knocker rigs. The fish feels no weight when it picks up the bait.',
    accessTypes: ['boat', 'kayak', 'shore', 'dock'],
    rigId: 'carolina_rig',
    tags: ['egg sinker', 'carolina rig', 'bottom fishing', 'sliding sinker'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/egg-sinkers' },
      { partnerId: 'amazon', url: '/s?k=egg+sinkers+assortment+saltwater' },
    ],
  },
  {
    id: 'pyramid_sinkers',
    name: 'Pyramid Sinkers (3-6 oz)',
    brand: 'Various',
    category: 'terminal',
    priceRange: '$8-15',
    description: 'Dig into sand and hold in surf current. Essential for beach fishing fish finder rigs.',
    accessTypes: ['surf', 'shore'],
    rigId: 'fish_finder',
    tags: ['pyramid sinker', 'surf fishing', 'beach', 'fish finder rig'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/pyramid-sinkers' },
      { partnerId: 'amazon', url: '/s?k=pyramid+sinkers+surf+fishing' },
    ],
  },
  {
    id: 'barrel_swivels',
    name: 'Barrel Swivels #7 (25 pack)',
    brand: 'Spro / Owner',
    category: 'terminal',
    priceRange: '$4-8',
    description: 'Prevents line twist between main line and leader. Used in almost every bottom rig.',
    accessTypes: ['boat', 'kayak', 'shore', 'surf', 'dock'],
    tags: ['swivel', 'barrel swivel', 'rig component'],
    affiliateLinks: [
      { partnerId: 'amazon', url: '/s?k=barrel+swivels+%237+saltwater' },
    ],
  },

  // ── LINE & LEADER ──────────────────────
  {
    id: 'braid_20lb',
    name: '20 lb Braided Line (300 yds)',
    brand: 'PowerPro / Sufix',
    category: 'line',
    priceRange: '$18-28',
    description: 'The standard inshore braided main line. Zero stretch for sensitivity, thin diameter for distance. Pair with fluorocarbon leader.',
    accessTypes: ['boat', 'kayak', 'shore', 'surf', 'dock'],
    species: ['redfish', 'speckled_trout', 'flounder', 'sheepshead'],
    knotId: 'palomar',
    tags: ['braided line', 'braid', 'main line', 'inshore', '20 lb'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/braided-fishing-line?q=20lb+braided' },
      { partnerId: 'amazon', url: '/s?k=20lb+braided+fishing+line+300+yards' },
    ],
    featured: true,
  },
  {
    id: 'fluoro_20lb',
    name: '20 lb Fluorocarbon Leader (25 yds)',
    brand: 'Seaguar / Berkley',
    category: 'line',
    priceRange: '$12-20',
    description: 'Nearly invisible underwater. The go-to leader material for clear water inshore fishing. Abrasion resistant around oyster bars and structure.',
    accessTypes: ['boat', 'kayak', 'shore', 'surf', 'dock'],
    knotId: 'double_uni',
    tags: ['fluorocarbon', 'leader', 'invisible', 'clear water'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/fluorocarbon-line?q=20lb+fluorocarbon+leader' },
      { partnerId: 'amazon', url: '/s?k=20lb+fluorocarbon+leader+saltwater' },
    ],
    featured: true,
  },

  // ── LURES & SOFT PLASTICS ──────────────
  {
    id: 'gulp_shrimp',
    name: 'Gulp! Alive Shrimp (3")',
    brand: 'Berkley',
    category: 'lures',
    priceRange: '$8-12',
    description: 'The most effective artificial bait in the Southeast. Biodegradable scented plastic that outfishes live shrimp on some days. New Penny and Nuclear Chicken are legendary colors.',
    accessTypes: ['boat', 'kayak', 'shore', 'dock'],
    species: ['speckled_trout', 'redfish', 'flounder', 'sheepshead'],
    rigId: 'popping_cork',
    tags: ['gulp', 'soft plastic', 'shrimp', 'artificial', 'popping cork'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/gulp-alive-shrimp' },
      { partnerId: 'amazon', url: '/s?k=berkley+gulp+alive+shrimp+3+inch' },
    ],
    featured: true,
  },
  {
    id: 'gold_spoon',
    name: 'Gold Johnson Spoon (1/4 - 1/2 oz)',
    brand: 'Johnson',
    category: 'lures',
    priceRange: '$4-8',
    description: 'A gold spoon over grass flats is redfish candy. Weedless design skims over vegetation. Cast and slow-retrieve — the wobble and flash do the work.',
    accessTypes: ['boat', 'kayak', 'shore'],
    species: ['redfish', 'speckled_trout'],
    rigId: 'spoon_rig',
    tags: ['gold spoon', 'johnson spoon', 'weedless', 'redfish', 'flats'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/johnson-silver-minnow-spoon' },
      { partnerId: 'amazon', url: '/s?k=johnson+gold+spoon+weedless' },
    ],
    featured: true,
  },
  {
    id: 'jig_heads',
    name: 'Jig Heads Assortment (1/8 - 3/8 oz)',
    brand: 'Owner / Z-Man',
    category: 'terminal',
    priceRange: '$6-12',
    description: 'Pair with any soft plastic for the most versatile artificial setup in fishing. Weight selection depends on depth and current.',
    accessTypes: ['boat', 'kayak', 'shore', 'dock', 'surf'],
    rigId: 'jig_head',
    tags: ['jig head', 'artificial', 'soft plastic', 'versatile'],
    affiliateLinks: [
      { partnerId: 'amazon', url: '/s?k=jig+heads+saltwater+assortment' },
    ],
  },
  {
    id: 'popping_cork',
    name: 'Popping Cork (Cajun Thunder)',
    brand: 'Cajun Thunder / MirrOlure',
    category: 'terminal',
    priceRange: '$5-10',
    description: 'The Southeast inshore staple. Pop-pop-pause drives speckled trout insane. Rattling bead version for murky water.',
    accessTypes: ['boat', 'kayak', 'shore', 'dock'],
    species: ['speckled_trout', 'redfish', 'flounder'],
    rigId: 'popping_cork',
    tags: ['popping cork', 'float', 'trout', 'inshore'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/popping-corks' },
      { partnerId: 'amazon', url: '/s?k=cajun+thunder+popping+cork' },
    ],
    featured: true,
  },

  // ── RODS ───────────────────────────────
  {
    id: 'inshore_spinning_rod',
    name: 'Inshore Spinning Rod 7\' Medium',
    brand: 'St. Croix / Shimano / Penn',
    category: 'rods',
    priceRange: '$80-200',
    description: 'The all-purpose inshore rod. 7-foot medium power with fast action handles everything from trout to redfish. Pair with a 3000-size spinning reel.',
    accessTypes: ['boat', 'kayak', 'shore', 'dock'],
    species: ['redfish', 'speckled_trout', 'flounder', 'sheepshead'],
    tags: ['spinning rod', 'inshore', 'medium', '7 foot', 'all purpose'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/spinning-rods?q=inshore+7+medium' },
      { partnerId: 'sportsmans', url: '/fishing/saltwater-rods/spinning-rods' },
    ],
    featured: true,
  },
  {
    id: 'surf_rod',
    name: 'Surf Spinning Rod 10-12\'',
    brand: 'Penn / Daiwa / Okuma',
    category: 'rods',
    priceRange: '$60-180',
    description: 'Long-range casting from the beach. 10-12 foot rods launch fish finder rigs past the breakers. Medium-heavy power for big redfish and sharks.',
    accessTypes: ['surf', 'shore'],
    species: ['redfish', 'black_drum', 'bull_shark'],
    rigId: 'fish_finder',
    tags: ['surf rod', 'beach', 'long cast', 'surf fishing'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/surf-rods' },
      { partnerId: 'amazon', url: '/s?k=surf+fishing+rod+10+foot+spinning' },
    ],
  },

  // ── REELS ──────────────────────────────
  {
    id: 'spinning_reel_3000',
    name: '3000-Size Spinning Reel',
    brand: 'Penn / Shimano / Daiwa',
    category: 'reels',
    priceRange: '$50-200',
    description: 'The standard inshore spinning reel. Holds 200+ yards of 20 lb braid. Sealed drag for saltwater. Pair with a 7-foot medium spinning rod.',
    accessTypes: ['boat', 'kayak', 'shore', 'dock'],
    tags: ['spinning reel', '3000', 'inshore', 'saltwater'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/spinning-reels?q=3000+saltwater' },
      { partnerId: 'amazon', url: '/s?k=3000+spinning+reel+saltwater' },
    ],
    featured: true,
  },

  // ── DRONE & KITE ───────────────────────
  {
    id: 'fishing_drone',
    name: 'Fishing Drone with Bait Release',
    brand: 'Gannet / SwellPro',
    category: 'drone_kite',
    priceRange: '$500-1,500',
    description: 'Fly bait out 200-500 yards from shore into deep water. Waterproof designs with GPS return-to-home and payload release systems.',
    accessTypes: ['surf', 'shore'],
    rigId: 'drone_rig',
    tags: ['drone', 'fishing drone', 'bait delivery', 'shore fishing', 'surf'],
    affiliateLinks: [
      { partnerId: 'amazon', url: '/s?k=fishing+drone+bait+release+waterproof' },
    ],
  },
  {
    id: 'fishing_kite',
    name: 'Fishing Kite Kit',
    brand: 'SFE / Aftco',
    category: 'drone_kite',
    priceRange: '$30-80',
    description: 'Wind-powered bait delivery for surface fishing. Works from shore or boat. Needs 8-15 mph sustained wind.',
    accessTypes: ['surf', 'shore', 'boat'],
    rigId: 'kite_rig',
    tags: ['kite', 'fishing kite', 'surface', 'live bait', 'pelagic'],
    affiliateLinks: [
      { partnerId: 'amazon', url: '/s?k=fishing+kite+kit+saltwater' },
    ],
  },

  // ── ACCESSORIES ────────────────────────
  {
    id: 'cast_net',
    name: 'Cast Net (3/8" mesh, 6-10\' radius)',
    brand: 'Betts / Ahi',
    category: 'bait',
    priceRange: '$30-80',
    description: 'Catch your own live bait — shrimp, mullet, menhaden. 3/8" mesh for shrimp, 1/2" for mullet. The most cost-effective way to have fresh bait every trip.',
    accessTypes: ['boat', 'kayak', 'shore', 'dock'],
    tags: ['cast net', 'bait', 'live bait', 'shrimp', 'mullet', 'net'],
    affiliateLinks: [
      { partnerId: 'bass_pro', url: '/shop/en/cast-nets' },
      { partnerId: 'amazon', url: '/s?k=cast+net+saltwater+3%2F8+mesh' },
    ],
    featured: true,
  },
  {
    id: 'sand_spikes',
    name: 'Sand Spike Rod Holders (2 pack)',
    brand: 'Various',
    category: 'surf_gear',
    priceRange: '$15-35',
    description: 'Plant your rod in the sand while surf fishing. Essential for fish finder rigs and drone rigs where you set it and wait.',
    accessTypes: ['surf', 'shore'],
    rigId: 'fish_finder',
    tags: ['sand spike', 'rod holder', 'surf', 'beach', 'hands free'],
    affiliateLinks: [
      { partnerId: 'amazon', url: '/s?k=sand+spike+rod+holder+surf+fishing' },
    ],
  },
];

// ── Helper: Build affiliate URL ──────────────
export function buildAffiliateUrl(partnerId: string, productPath: string): string {
  const partner = AFFILIATE_PARTNERS.find(p => p.id === partnerId);
  if (!partner) return productPath;
  const separator = productPath.includes('?') ? '&' : '?';
  return `${partner.baseUrl}${productPath}${separator}tag=${partner.affiliateTag}`;
}

// ── Helper: Get products by category ─────────
export function getProductsByCategory(categoryId: string): ShopProduct[] {
  return SHOP_PRODUCTS.filter(p => p.category === categoryId);
}

// ── Helper: Get products for a rig ───────────
export function getProductsForRig(rigId: string): ShopProduct[] {
  return SHOP_PRODUCTS.filter(p => p.rigId === rigId);
}

// ── Helper: Get products for a species ───────
export function getProductsForSpecies(speciesId: string): ShopProduct[] {
  return SHOP_PRODUCTS.filter(p => p.species?.includes(speciesId));
}

// ── Helper: Get featured products ────────────
export function getFeaturedProducts(): ShopProduct[] {
  return SHOP_PRODUCTS.filter(p => p.featured);
}

// ── Helper: Get products for access type ─────
export function getProductsForAccessType(accessType: string): ShopProduct[] {
  return SHOP_PRODUCTS.filter(p => p.accessTypes.includes(accessType));
}
