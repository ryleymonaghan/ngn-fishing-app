// ─────────────────────────────────────────────
// NGN Fishing — Rig Assembly Guide Database
// 14 essential rigs with step-by-step assembly instructions.
// Tagged by access type and target species for AI report deep-linking.
// ─────────────────────────────────────────────

export interface RigStep {
  step: number;
  instruction: string;
  tip?: string;
  knotId?: string;         // links to knot guide (e.g. 'palomar')
}

export interface FishingRig {
  id: string;
  name: string;
  category: 'bottom' | 'float' | 'casting' | 'trolling' | 'surf' | 'specialty';
  categoryLabel: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  accessTypes: string[];   // which access types this rig works for
  species: string[];       // species IDs this rig targets
  description: string;     // when/why to use this rig
  components: string[];    // parts list
  steps: RigStep[];
}

// ── Bottom Rigs ─────────────────────────────

const CAROLINA_RIG: FishingRig = {
  id: 'carolina_rig',
  name: 'Carolina Rig',
  category: 'bottom',
  categoryLabel: 'Bottom Fishing',
  difficulty: 'beginner',
  accessTypes: ['boat', 'kayak', 'shore', 'dock'],
  species: ['flounder', 'redfish', 'black_drum', 'speckled_trout'],
  description: 'The workhorse of inshore bottom fishing. Keeps bait on or near the bottom while letting it drift naturally with the current. Deadly for flounder and redfish on mud/sand bottoms.',
  components: ['1/2–1 oz egg sinker', 'Glass or plastic bead', 'Barrel swivel (size 7)', '18–24 inch fluorocarbon leader (15–20 lb)', '1/0–3/0 circle or offset hook'],
  steps: [
    { step: 1, instruction: 'Slide the egg sinker onto your main line (tag end first through the hole).' },
    { step: 2, instruction: 'Slide a bead onto the line after the sinker.', tip: 'The bead protects your knot from the sinker and makes a clicking sound that attracts fish.' },
    { step: 3, instruction: 'Tie the main line to one end of the barrel swivel.', knotId: 'palomar' },
    { step: 4, instruction: 'Cut 18–24 inches of fluorocarbon leader.' },
    { step: 5, instruction: 'Tie one end of the leader to the other end of the swivel.', knotId: 'improved_clinch' },
    { step: 6, instruction: 'Tie your hook to the end of the leader.', knotId: 'snell' },
    { step: 7, instruction: 'Thread your bait onto the hook. For live shrimp: hook through the tail. For cut bait: thread up the shank.', tip: 'The sinker slides freely above the swivel — when a fish picks up the bait, it feels no weight.' },
  ],
};

const FISH_FINDER_RIG: FishingRig = {
  id: 'fish_finder',
  name: 'Fish Finder Rig',
  category: 'surf',
  categoryLabel: 'Surf / Beach',
  difficulty: 'beginner',
  accessTypes: ['surf', 'shore'],
  species: ['redfish', 'black_drum', 'flounder', 'bull_shark'],
  description: 'The #1 surf fishing rig. The sinker slider lets a fish take the bait and run without feeling resistance. Perfect for beach fishing where you need distance and the bait sits on the bottom.',
  components: ['Sinker slider clip', '3–6 oz pyramid sinker', 'Bead', 'Barrel swivel', '24–36 inch mono or fluoro leader (20–40 lb)', '5/0–8/0 circle hook'],
  steps: [
    { step: 1, instruction: 'Slide a sinker slider clip onto your main line.' },
    { step: 2, instruction: 'Attach the pyramid sinker to the slider clip.', tip: 'Pyramid sinkers dig into sand and hold in surf current. Use 3 oz in calm surf, 5-6 oz in heavy surf.' },
    { step: 3, instruction: 'Slide a bead onto the main line after the slider.' },
    { step: 4, instruction: 'Tie the main line to a barrel swivel.', knotId: 'uni_knot' },
    { step: 5, instruction: 'Cut 24–36 inches of leader. Longer leader = more natural presentation in the wash.' },
    { step: 6, instruction: 'Tie the leader to the other end of the swivel.', knotId: 'improved_clinch' },
    { step: 7, instruction: 'Tie a circle hook to the end of the leader.', knotId: 'snell' },
    { step: 8, instruction: 'Bait with fresh cut mullet, shrimp, or sand fleas.', tip: 'For drone/kite delivery: keep the sinker light (2 oz) since you\'re placing it — you don\'t need casting weight.' },
  ],
};

const HIGH_LOW_RIG: FishingRig = {
  id: 'high_low',
  name: 'High-Low Rig (Chicken Rig)',
  category: 'bottom',
  categoryLabel: 'Bottom Fishing',
  difficulty: 'intermediate',
  accessTypes: ['boat', 'shore', 'dock', 'kayak'],
  species: ['sheepshead', 'black_drum', 'flounder', 'gag_grouper', 'red_snapper'],
  description: 'Two hooks at different heights — doubles your chances and lets you fish two baits simultaneously. Also called a chicken rig. Essential for sheepshead around pilings and offshore bottom fishing.',
  components: ['2–3 ft mono leader (30–40 lb)', 'Two dropper loops (or pre-made dropper arms)', 'Two hooks (1/0–4/0 depending on species)', 'Bank sinker (1–4 oz)', 'Barrel swivel'],
  steps: [
    { step: 1, instruction: 'Cut about 3 feet of 30-40 lb mono or fluoro leader.' },
    { step: 2, instruction: 'Tie a barrel swivel to the top end of the leader.', knotId: 'improved_clinch' },
    { step: 3, instruction: 'Tie a dropper loop about 8 inches from the bottom of the leader.', knotId: 'dropper_loop' },
    { step: 4, instruction: 'Tie a second dropper loop about 10 inches above the first one.', knotId: 'dropper_loop' },
    { step: 5, instruction: 'Attach a hook to each dropper loop by passing the hook point through the loop and pulling tight.' },
    { step: 6, instruction: 'Tie a bank sinker to the very bottom of the leader with a simple overhand knot or clinch knot.', tip: 'Use enough weight to stay on bottom. Heavier in current, lighter in calm water.' },
    { step: 7, instruction: 'Connect your main line to the barrel swivel at the top.' },
    { step: 8, instruction: 'Bait both hooks — try different baits on each to see what\'s hitting.', tip: 'For sheepshead: fiddler crabs on both hooks. They can\'t resist.' },
  ],
};

const KNOCKER_RIG: FishingRig = {
  id: 'knocker_rig',
  name: 'Knocker Rig',
  category: 'bottom',
  categoryLabel: 'Bottom Fishing',
  difficulty: 'beginner',
  accessTypes: ['boat', 'kayak'],
  species: ['gag_grouper', 'red_snapper', 'amberjack', 'sheepshead'],
  description: 'A simplified bottom rig where the sinker sits directly on the hook eye. Reduces snags on reef and structure. The standard offshore bottom fishing rig for grouper and snapper.',
  components: ['Egg sinker (1–4 oz)', '5/0–7/0 circle hook', 'Fluorocarbon leader (40–60 lb)'],
  steps: [
    { step: 1, instruction: 'Cut 24–36 inches of heavy fluorocarbon leader.' },
    { step: 2, instruction: 'Slide the egg sinker onto the leader.' },
    { step: 3, instruction: 'Tie the circle hook directly to the end of the leader.', knotId: 'snell' },
    { step: 4, instruction: 'The sinker should rest against the hook eye. That\'s it — simplest rig in fishing.', tip: 'The sinker knocking against the hook eye on structure is what gives it the name. Fish hear it.' },
    { step: 5, instruction: 'Connect the other end of the leader to your main line via a swivel or FG knot.', knotId: 'fg_knot' },
    { step: 6, instruction: 'Bait with live or cut bait. Drop straight down on structure.', tip: 'When you feel the bite, don\'t set the hook — just reel. The circle hook does the work.' },
  ],
};

// ── Float Rigs ──────────────────────────────

const POPPING_CORK: FishingRig = {
  id: 'popping_cork',
  name: 'Popping Cork Rig',
  category: 'float',
  categoryLabel: 'Float / Suspended',
  difficulty: 'beginner',
  accessTypes: ['boat', 'kayak', 'shore', 'dock'],
  species: ['speckled_trout', 'redfish', 'flounder'],
  description: 'The Southeast inshore staple. The concave top of the cork makes a "pop" when twitched, imitating a shrimp fleeing on the surface. Speckled trout can\'t resist it. Works from any platform.',
  components: ['Popping cork (Cajun Thunder, MirrOlure, or similar)', '18–24 inch fluorocarbon leader (15–20 lb)', '1/0 jig head (1/8–1/4 oz)', 'Soft plastic (Gulp shrimp, DOA shrimp, or Z-Man)'],
  steps: [
    { step: 1, instruction: 'Thread your main line through the popping cork\'s wire stem. The concave (cupped) side faces UP.', tip: 'Some corks have a bead rattle inside — these are extra effective in murky water.' },
    { step: 2, instruction: 'The cork clips or ties to your main line. Secure it with the provided beads and spring clip.' },
    { step: 3, instruction: 'Cut 18–24 inches of fluorocarbon leader.' },
    { step: 4, instruction: 'Tie the leader to the bottom of the cork rig clip or swivel.' },
    { step: 5, instruction: 'Thread a soft plastic onto the jig head — match the size to your bait (3" for shrimp, 4" for mullet pattern).', tip: 'Gulp shrimp in New Penny or Nuclear Chicken colors are Lowcountry legends for a reason.' },
    { step: 6, instruction: 'Tie the jig head to the end of the leader.', knotId: 'palomar' },
    { step: 7, instruction: 'Cast near structure, grass edges, or oyster bars. Pop-pop-pause. Pop-pop-pause. The pause is when they strike.', tip: 'Adjust leader length to water depth — the bait should be 6-12 inches off the bottom.' },
  ],
};

const SLIP_FLOAT: FishingRig = {
  id: 'slip_float',
  name: 'Slip Float Rig',
  category: 'float',
  categoryLabel: 'Float / Suspended',
  difficulty: 'intermediate',
  accessTypes: ['boat', 'kayak', 'shore', 'dock'],
  species: ['speckled_trout', 'sheepshead', 'redfish', 'tarpon'],
  description: 'Suspends bait at an exact depth — adjustable on the fly. Unlike a fixed bobber, the float slides on the line so you can cast normally even when fishing deep. Essential for dock pilings and bridge fishing.',
  components: ['Slip float (pencil or cigar style)', 'Bobber stop (thread or rubber)', 'Small bead', 'Split shot (1-2 BB size)', '1/0–2/0 circle hook', 'Live bait (shrimp, mud minnow, or pinfish)'],
  steps: [
    { step: 1, instruction: 'Thread a bobber stop onto your main line at the depth you want to fish. This stop prevents the float from sliding past this point.' },
    { step: 2, instruction: 'Slide a small bead onto the line after the stop.', tip: 'The bead keeps the stop from slipping through the float hole.' },
    { step: 3, instruction: 'Thread the line through the center hole of the slip float.' },
    { step: 4, instruction: 'Pinch 1-2 split shot onto the line about 12 inches above where you\'ll tie the hook.', tip: 'Enough weight to make the float stand upright but not pull it under.' },
    { step: 5, instruction: 'Tie your circle hook to the end of the line.', knotId: 'uni_knot' },
    { step: 6, instruction: 'Hook your live bait — shrimp through the horn, minnow through the lips.', tip: 'When the float dips or lays flat — that\'s a bite. Wait 2 seconds, then reel tight. Let the circle hook do the rest.' },
  ],
};

// ── Casting / Lure Rigs ─────────────────────

const JIG_HEAD: FishingRig = {
  id: 'jig_head',
  name: 'Jig Head + Soft Plastic',
  category: 'casting',
  categoryLabel: 'Casting / Lure',
  difficulty: 'beginner',
  accessTypes: ['boat', 'kayak', 'shore', 'dock', 'surf'],
  species: ['speckled_trout', 'redfish', 'flounder', 'spanish_mackerel'],
  description: 'The simplest and most effective artificial setup. A weighted hook head with a soft plastic body. Works everywhere, from docks to surf to offshore structure. If you only bring one lure, bring this.',
  components: ['Jig head (1/8–3/8 oz depending on depth and current)', 'Soft plastic body (paddle tail, shrimp, or jerk bait)', 'Optional: 18" fluorocarbon leader'],
  steps: [
    { step: 1, instruction: 'Select jig head weight based on conditions: 1/8 oz for shallow calm water, 1/4 oz for moderate depth/current, 3/8 oz for deep or heavy current.' },
    { step: 2, instruction: 'Hold the soft plastic against the jig head to measure. The hook point should exit at the thick part of the body.' },
    { step: 3, instruction: 'Thread the soft plastic onto the jig head — insert through the nose, run up the shank, and pop the hook point out the back.', tip: 'The plastic should hang straight with no twist. Crooked = bad action. Re-thread if needed.' },
    { step: 4, instruction: 'If using braid, tie a 18" fluorocarbon leader with a double uni knot.', knotId: 'double_uni' },
    { step: 5, instruction: 'Tie the jig head to the leader (or directly to mono/fluoro mainline).', knotId: 'palomar' },
    { step: 6, instruction: 'Cast, let it sink to desired depth, then retrieve with a twitch-twitch-pause cadence.', tip: 'Most strikes come on the pause or the fall. Keep slack out of the line so you feel the tap.' },
  ],
};

const SPOON_RIG: FishingRig = {
  id: 'spoon_rig',
  name: 'Gold Spoon (Weedless)',
  category: 'casting',
  categoryLabel: 'Casting / Lure',
  difficulty: 'beginner',
  accessTypes: ['boat', 'kayak', 'shore'],
  species: ['redfish', 'speckled_trout', 'flounder'],
  description: 'A gold Johnson spoon over grass flats is redfish candy. The weedless design skims over grass without snagging. Cast it across a flat on a falling tide and hold on.',
  components: ['Gold Johnson spoon (1/4 or 1/2 oz)', 'Optional: fluorocarbon leader (20 lb, 18")'],
  steps: [
    { step: 1, instruction: 'If using braided main line, tie an 18" fluorocarbon leader.', knotId: 'double_uni' },
    { step: 2, instruction: 'Tie the spoon to the leader using a loop knot — this lets the spoon swing and wobble freely.', knotId: 'non_slip_loop' },
    { step: 3, instruction: 'Cast over grass flats, oyster bars, or mud banks — anywhere redfish cruise.', tip: 'The weedguard lets you throw into heavy grass. Don\'t be afraid to cast right into the muck.' },
    { step: 4, instruction: 'Retrieve with a slow, steady reel. The spoon wobbles and flashes on its own — don\'t overthink it.' },
    { step: 5, instruction: 'When you see a wake following the spoon, slow down slightly. The speed change triggers the strike.', tip: 'On low/falling tides, reds push onto flats to hunt. That\'s prime spoon time.' },
  ],
};

// ── Trolling Rigs ───────────────────────────

const BALLYHOO_RIG: FishingRig = {
  id: 'ballyhoo_rig',
  name: 'Ballyhoo Trolling Rig',
  category: 'trolling',
  categoryLabel: 'Offshore Trolling',
  difficulty: 'advanced',
  accessTypes: ['boat'],
  species: ['mahi', 'wahoo', 'sailfish', 'king_mackerel'],
  description: 'The standard offshore trolling bait rig. A rigged ballyhoo behind a skirt or sea witch is the most productive offshore trolling setup in the Southeast. Required knowledge for anyone fishing the Gulf Stream.',
  components: ['Frozen ballyhoo', 'Wire rigging pin or #7 wire', '7/0–9/0 J-hook', 'Copper rigging wire (or wax thread)', 'Trolling skirt or sea witch', 'Egg sinker (optional, 1/4–1/2 oz)', 'Snap swivel'],
  steps: [
    { step: 1, instruction: 'Thaw the ballyhoo and break its back by gently bending the body in a few places. This gives it a swimming action.' },
    { step: 2, instruction: 'Insert the hook point into the ballyhoo\'s throat and push it through until the eye exits the gill plate.' },
    { step: 3, instruction: 'Position the hook so the point rides UP and exits the belly about 2/3 back from the head.', tip: 'The hook point must ride up — down-riding hooks spin and tangle.' },
    { step: 4, instruction: 'Use copper wire to wrap the ballyhoo\'s bill to the hook shank — 6-8 tight wraps. This secures the bait to the hook.' },
    { step: 5, instruction: 'Slide the trolling skirt or sea witch over the leader and down to the ballyhoo\'s head.', tip: 'Match skirt color to conditions: blue/white in clear water, pink/white in murky, green/yellow in Gulf Stream.' },
    { step: 6, instruction: 'Connect to your main line or trolling leader via snap swivel or haywire twist if using wire.', knotId: 'haywire_twist' },
    { step: 7, instruction: 'Troll at 6-8 knots. The bait should swim straight with no spin.', tip: 'If the bait spins, the hook is off-center or the wire wrap is too tight on one side. Re-rig.' },
  ],
};

// ── Specialty Rigs ──────────────────────────

const DRONE_RIG: FishingRig = {
  id: 'drone_rig',
  name: 'Drone Drop Rig',
  category: 'specialty',
  categoryLabel: 'Specialty — Shore Delivery',
  difficulty: 'intermediate',
  accessTypes: ['surf', 'shore'],
  species: ['redfish', 'black_drum', 'bull_shark', 'cobia'],
  description: 'Specifically designed for drone bait delivery from shore. Lighter sinker since you\'re placing the bait — no casting weight needed. The drone flies the rig out 200-500 yards and drops it in the target zone.',
  components: ['Drone release clip (or gannet-style bait dropper)', '1–2 oz pyramid or bank sinker', 'Barrel swivel', '36 inch heavy fluorocarbon leader (40–60 lb)', '7/0–10/0 circle hook', 'Large live or cut bait'],
  steps: [
    { step: 1, instruction: 'Tie your main line to a barrel swivel.', knotId: 'palomar' },
    { step: 2, instruction: 'Slide a 1-2 oz sinker onto a 6 inch dropper line. Tie the dropper to the same swivel.', tip: 'Light sinker only — the drone places it. You don\'t need 5 oz to hold in current from shore.' },
    { step: 3, instruction: 'Cut 36 inches of heavy fluorocarbon leader. Tie to the other end of the swivel.' },
    { step: 4, instruction: 'Tie a large circle hook to the end of the leader.', knotId: 'snell' },
    { step: 5, instruction: 'Bait with a large live bait (mullet, croaker, spot) or a chunk of cut mullet/bonito.' },
    { step: 6, instruction: 'Attach the drone release clip to the line above the swivel. Set the rod in a sand spike with drag set loose.' },
    { step: 7, instruction: 'Fly the drone out to target depth (second sandbar, channel edge, or deep trough) and release.', tip: 'Check drone wind limits. Most fishing drones max out around 15-18 mph wind. Don\'t push it.' },
    { step: 8, instruction: 'Tighten drag slightly once bait is in position. Wait for the rod to load up.', tip: 'With circle hooks, let the fish run. When the rod fully bends, start reeling. Never jerk-set a circle hook.' },
  ],
};

const KITE_RIG: FishingRig = {
  id: 'kite_rig',
  name: 'Kite Fishing Rig',
  category: 'specialty',
  categoryLabel: 'Specialty — Shore Delivery',
  difficulty: 'advanced',
  accessTypes: ['surf', 'shore', 'boat'],
  species: ['sailfish', 'king_mackerel', 'cobia', 'tarpon', 'mahi'],
  description: 'Wind-powered bait delivery that keeps live bait on the surface — irresistible to pelagic predators. Originally a South Florida boat technique, now adapted for shore fishing in consistent wind.',
  components: ['Fishing kite (single or double)', 'Kite rod/reel (or heavy spinning setup)', 'Release clips (Blacks, Aftco, or similar)', 'Heavy spinning rod for the bait line', '30–50 lb leader', '5/0–7/0 circle hook', 'Live bait (mullet, goggle-eye, or blue runner)'],
  steps: [
    { step: 1, instruction: 'Set up the kite rod with the kite attached to the kite line. Deploy the kite into the wind.', tip: 'You need 8-15 mph sustained wind for a single kite. Light wind? Use a helium balloon assist.' },
    { step: 2, instruction: 'Attach a release clip to the kite line about 50-75 feet out (adjust distance by adding more kite line).' },
    { step: 3, instruction: 'On your fishing rod, tie a leader and circle hook. Hook a lively bait fish through the back (near the dorsal fin).', knotId: 'snell' },
    { step: 4, instruction: 'Clip your fishing line into the release clip hanging from the kite line.' },
    { step: 5, instruction: 'Let out kite line so the bait is positioned at the surface — the kite should hold the bait so it splashes and struggles on top.', tip: 'The bait should "skip" on the surface. This commotion is what draws predators from below.' },
    { step: 6, instruction: 'When a fish strikes, the line pops free from the release clip. Let the fish eat, then tighten up and fight.' },
    { step: 7, instruction: 'For shore kite fishing: anchor the kite rod in a sand spike. Use the wind to walk the bait out beyond the breakers.', tip: 'Shore kite fishing works best when wind blows offshore or parallel to the beach.' },
  ],
};

// ── Export All Rigs ──────────────────────────

export const FISHING_RIGS: FishingRig[] = [
  // Bottom
  CAROLINA_RIG,
  FISH_FINDER_RIG,
  HIGH_LOW_RIG,
  KNOCKER_RIG,
  // Float
  POPPING_CORK,
  SLIP_FLOAT,
  // Casting
  JIG_HEAD,
  SPOON_RIG,
  // Trolling
  BALLYHOO_RIG,
  // Specialty
  DRONE_RIG,
  KITE_RIG,
];

// ── Category groups for UI ───────────────────
export const RIG_CATEGORIES = [
  { id: 'bottom',    label: 'Bottom Fishing',           count: 4 },
  { id: 'float',     label: 'Float / Suspended',        count: 2 },
  { id: 'casting',   label: 'Casting / Lure',           count: 2 },
  { id: 'trolling',  label: 'Offshore Trolling',        count: 1 },
  { id: 'specialty', label: 'Specialty — Shore Delivery', count: 2 },
] as const;
