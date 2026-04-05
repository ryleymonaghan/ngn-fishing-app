// ─────────────────────────────────────────────
// NGN Fishing — Knot Tying Guide Database
// 15 essential fishing knots with step-by-step instructions.
// Each step is one atomic action — easy to pause and resume.
// ─────────────────────────────────────────────

export interface KnotStep {
  step: number;
  instruction: string;
  tip?: string;            // optional pro tip for this step
}

export interface FishingKnot {
  id: string;
  name: string;
  category: 'terminal' | 'loop' | 'line_to_line' | 'leader' | 'specialty';
  categoryLabel: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  strengthPct: number;     // approximate knot strength (% of line rating)
  bestFor: string[];       // e.g. ['circle hooks', 'braided line', 'fluorocarbon']
  useCases: string;        // when and why to use this knot
  steps: KnotStep[];
}

// ── Terminal Knots (hook/lure to line) ───────

const PALOMAR: FishingKnot = {
  id: 'palomar',
  name: 'Palomar Knot',
  category: 'terminal',
  categoryLabel: 'Hook / Lure Connection',
  difficulty: 'beginner',
  strengthPct: 95,
  bestFor: ['braided line', 'circle hooks', 'jig heads', 'swivels'],
  useCases: 'The go-to knot for braided line. Strongest terminal knot for braid. Use anytime you tie a hook, jig, or swivel to braided line.',
  steps: [
    { step: 1, instruction: 'Double about 6 inches of line and pass the loop through the eye of the hook.' },
    { step: 2, instruction: 'Tie a simple overhand knot with the doubled line — don\'t tighten it yet. The hook should hang from the bottom.', tip: 'Keep the loop large enough to pass the hook through.' },
    { step: 3, instruction: 'Pass the loop over the entire hook (or lure).' },
    { step: 4, instruction: 'Pull both the standing line and the tag end to tighten. The loop should cinch snugly around the eye.' },
    { step: 5, instruction: 'Moisten the knot with saliva and pull tight. Trim the tag end to about 1/8 inch.', tip: 'Always wet the knot before final tightening — dry line creates friction heat that weakens it.' },
  ],
};

const IMPROVED_CLINCH: FishingKnot = {
  id: 'improved_clinch',
  name: 'Improved Clinch Knot',
  category: 'terminal',
  categoryLabel: 'Hook / Lure Connection',
  difficulty: 'beginner',
  strengthPct: 89,
  bestFor: ['monofilament', 'fluorocarbon', 'hooks', 'lures', 'swivels'],
  useCases: 'The classic all-purpose knot. Works with mono and fluorocarbon up to 30 lb test. Fast to tie, reliable. Not recommended for braided line (slips).',
  steps: [
    { step: 1, instruction: 'Thread 6 inches of line through the eye of the hook.' },
    { step: 2, instruction: 'Wrap the tag end around the standing line 5 times.', tip: 'Use 5 wraps for lines under 20 lb, 4 wraps for heavier.' },
    { step: 3, instruction: 'Pass the tag end through the small loop formed just above the eye of the hook.' },
    { step: 4, instruction: 'Now pass the tag end through the big loop you just created.' },
    { step: 5, instruction: 'Moisten and pull the standing line to tighten. The coils should stack neatly against the eye.' },
    { step: 6, instruction: 'Trim the tag end close to the knot.' },
  ],
};

const UNI_KNOT: FishingKnot = {
  id: 'uni_knot',
  name: 'Uni Knot',
  category: 'terminal',
  categoryLabel: 'Hook / Lure Connection',
  difficulty: 'beginner',
  strengthPct: 90,
  bestFor: ['monofilament', 'fluorocarbon', 'braided line', 'all-purpose'],
  useCases: 'The most versatile knot in fishing. Works with any line type. Can also be used to join two lines (double uni). Learn this one and you can fish anywhere.',
  steps: [
    { step: 1, instruction: 'Pass 8 inches of line through the eye of the hook.' },
    { step: 2, instruction: 'Bring the tag end back parallel to the standing line, forming a loop beside the lines.' },
    { step: 3, instruction: 'Wrap the tag end around both lines (inside the loop) 5-6 times, working away from the hook.', tip: '6 wraps for mono under 20 lb, 4-5 wraps for braid.' },
    { step: 4, instruction: 'Moisten the knot and pull the tag end to cinch the wraps tight.' },
    { step: 5, instruction: 'Slide the knot down to the eye of the hook by pulling the standing line.' },
    { step: 6, instruction: 'Pull both the standing line and tag end for final tightening. Trim the tag end.' },
  ],
};

const SNELL: FishingKnot = {
  id: 'snell',
  name: 'Snell Knot',
  category: 'terminal',
  categoryLabel: 'Hook / Lure Connection',
  difficulty: 'intermediate',
  strengthPct: 97,
  bestFor: ['circle hooks', 'octopus hooks', 'live bait', 'bottom fishing'],
  useCases: 'The strongest hook connection. Wraps around the shank instead of through the eye, giving circle hooks the perfect angle for jaw hooksets. Essential for bottom fishing and live bait.',
  steps: [
    { step: 1, instruction: 'Thread the line through the hook eye from the point side. Pull about 8 inches through.' },
    { step: 2, instruction: 'Form a small loop at the eye, with the tag end running along the shank.' },
    { step: 3, instruction: 'Wrap the tag end tightly around the hook shank AND the standing line — 7 wraps, working toward the bend.', tip: 'Keep the wraps tight and side by side. No overlapping.' },
    { step: 4, instruction: 'Hold the wraps with your thumb and pull the standing line to close the loop at the eye.' },
    { step: 5, instruction: 'Moisten and pull firmly on the standing line. The wraps should lock tight against the shank.' },
    { step: 6, instruction: 'Trim the tag end flush. The line should exit straight out from the eye.', tip: 'A proper snell makes the hook rotate into the corner of the mouth when a fish pulls — that\'s the whole point.' },
  ],
};

const LOOP_KNOT: FishingKnot = {
  id: 'non_slip_loop',
  name: 'Non-Slip Loop Knot',
  category: 'loop',
  categoryLabel: 'Loop Knots',
  difficulty: 'intermediate',
  strengthPct: 90,
  bestFor: ['jigs', 'topwater plugs', 'mirrolures', 'swim baits'],
  useCases: 'Gives your lure freedom to swing and move naturally instead of being locked rigid to the line. Use on any lure where natural action matters — topwater, jerkbaits, swim baits, jigs.',
  steps: [
    { step: 1, instruction: 'Tie a loose overhand knot about 5 inches from the end of the line. Don\'t tighten it.' },
    { step: 2, instruction: 'Pass the tag end through the eye of the lure.' },
    { step: 3, instruction: 'Bring the tag end back through the overhand knot — enter from the SAME side you exited.' },
    { step: 4, instruction: 'Wrap the tag end around the standing line 5 times.', tip: '5 wraps for 8-12 lb, 4 wraps for 15-20 lb, 3 wraps for 25 lb+.' },
    { step: 5, instruction: 'Pass the tag end back through the overhand knot — same side again.' },
    { step: 6, instruction: 'Moisten and pull the tag end first to seat the wraps, then pull the standing line to tighten the overhand knot.' },
    { step: 7, instruction: 'Trim the tag end. You should have a small fixed loop at the eye that lets the lure swing freely.' },
  ],
};

const DROPPER_LOOP: FishingKnot = {
  id: 'dropper_loop',
  name: 'Dropper Loop',
  category: 'loop',
  categoryLabel: 'Loop Knots',
  difficulty: 'intermediate',
  strengthPct: 85,
  bestFor: ['high-low rigs', 'surf rigs', 'bottom rigs', 'multi-hook setups'],
  useCases: 'Creates a loop in the middle of your line to attach a hook or dropper. Essential for tying high-low rigs and surf fishing bottom rigs.',
  steps: [
    { step: 1, instruction: 'Form a loop in the line where you want the dropper. The loop should be about 3-4 inches.' },
    { step: 2, instruction: 'Twist the loop around the standing line 6 times.', tip: 'Keep count — too few wraps and it slips, too many and it won\'t cinch.' },
    { step: 3, instruction: 'Find the center of the twists and push the original loop through the middle opening.' },
    { step: 4, instruction: 'Hold the loop open with your finger or a pen while you pull both ends of the standing line.' },
    { step: 5, instruction: 'Moisten and pull tight. The loop should stick out perpendicular to the line.' },
    { step: 6, instruction: 'Attach your hook or weight to the loop using a clip or by passing the hook through.', tip: 'The loop should be big enough to pass a hook through but small enough to stay stiff.' },
  ],
};

// ── Line-to-Line Knots ──────────────────────

const DOUBLE_UNI: FishingKnot = {
  id: 'double_uni',
  name: 'Double Uni Knot',
  category: 'line_to_line',
  categoryLabel: 'Line-to-Line / Leader',
  difficulty: 'beginner',
  strengthPct: 85,
  bestFor: ['braid to fluoro', 'braid to mono', 'leader connections', 'similar diameter lines'],
  useCases: 'The easiest way to join two lines. If you know the uni knot, you already know this one — just tie two uni knots facing each other. Great for braid-to-fluorocarbon leader connections.',
  steps: [
    { step: 1, instruction: 'Overlap the two lines by about 8 inches — tag ends pointing in opposite directions.' },
    { step: 2, instruction: 'Take the first tag end and form a uni knot around the second line: make a loop and wrap through it 5 times.', tip: '6-8 wraps for braided line, 4-5 for mono/fluoro.' },
    { step: 3, instruction: 'Moisten and pull tight. You now have one uni knot cinched on the second line.' },
    { step: 4, instruction: 'Repeat with the second tag end: form a uni knot around the first line with the same number of wraps.' },
    { step: 5, instruction: 'Moisten and pull that knot tight too.' },
    { step: 6, instruction: 'Pull both standing lines in opposite directions — the two knots will slide together and lock.' },
    { step: 7, instruction: 'Trim both tag ends close to the knots.', tip: 'For casting, the slim profile of this knot slides through rod guides better than most.' },
  ],
};

const FG_KNOT: FishingKnot = {
  id: 'fg_knot',
  name: 'FG Knot',
  category: 'line_to_line',
  categoryLabel: 'Line-to-Line / Leader',
  difficulty: 'advanced',
  strengthPct: 98,
  bestFor: ['braid to fluoro', 'braid to mono', 'slim profile', 'casting distance'],
  useCases: 'The strongest and slimmest braid-to-leader connection. Passes through guides like butter. Worth learning for anyone using braided line regularly. Takes practice but is unbeatable once mastered.',
  steps: [
    { step: 1, instruction: 'Tension the braided line between your teeth (or a clip) and your reel. The braid needs to be tight.' },
    { step: 2, instruction: 'Lay the fluorocarbon/mono leader across the tensioned braid at a 90° angle.' },
    { step: 3, instruction: 'Weave the braid alternating over and under the leader — one wrap over the top, cross underneath, one wrap over the top, cross underneath.', tip: 'Think of it like a Chinese finger trap. The braid weaves around the leader.' },
    { step: 4, instruction: 'Do 15-20 alternating wraps total (that\'s 15-20 passes over the leader). Keep them tight and side by side.' },
    { step: 5, instruction: 'Lock the weave with 2-3 half hitches using the braided line around the leader.' },
    { step: 6, instruction: 'Add 3-4 more half hitches moving up the braid (away from the weave) to create a taper. Alternate the direction of each hitch.' },
    { step: 7, instruction: 'Trim the leader tag end as close as possible to the weave.' },
    { step: 8, instruction: 'Trim the braid tag end and singe it lightly with a lighter to prevent fraying.', tip: 'The finished knot should be barely thicker than the leader. If done right, you\'ll feel zero bump through the guides.' },
  ],
};

const BLOOD_KNOT: FishingKnot = {
  id: 'blood_knot',
  name: 'Blood Knot',
  category: 'line_to_line',
  categoryLabel: 'Line-to-Line / Leader',
  difficulty: 'intermediate',
  strengthPct: 83,
  bestFor: ['similar diameter lines', 'mono to mono', 'fluoro to fluoro', 'fly fishing'],
  useCases: 'Classic knot for joining two lines of similar diameter. Common in fly fishing for building tapered leaders. Low-profile and symmetrical.',
  steps: [
    { step: 1, instruction: 'Overlap the ends of the two lines by about 6 inches.' },
    { step: 2, instruction: 'Wrap the first tag end around the second line 5 times.' },
    { step: 3, instruction: 'Bring the first tag end back and tuck it between the two lines at the center (where the wraps start).' },
    { step: 4, instruction: 'Wrap the second tag end around the first line 5 times (going the opposite direction).' },
    { step: 5, instruction: 'Tuck the second tag end through the center opening from the OPPOSITE direction as the first tag end.' },
    { step: 6, instruction: 'Moisten everything and slowly pull both standing lines. The wraps should compress symmetrically into a barrel shape.' },
    { step: 7, instruction: 'Trim both tag ends close.' },
  ],
};

// ── Leader Knots ─────────────────────────────

const ALBRIGHT: FishingKnot = {
  id: 'albright',
  name: 'Albright Knot',
  category: 'leader',
  categoryLabel: 'Leader Connections',
  difficulty: 'intermediate',
  strengthPct: 85,
  bestFor: ['different diameter lines', 'wire leader', 'heavy mono leader', 'offshore leader'],
  useCases: 'Best knot for connecting lines of very different diameters — like 20 lb braid to 80 lb fluorocarbon. Also works with wire leader for toothy fish (king mackerel, barracuda).',
  steps: [
    { step: 1, instruction: 'Make a loop in the heavier line (or wire) and hold it between thumb and forefinger.' },
    { step: 2, instruction: 'Thread the lighter line through the loop from bottom to top.' },
    { step: 3, instruction: 'Pinch the lighter line against the loop. Wrap the lighter line around the loop and itself — 10 wraps, working from the open end of the loop toward the closed end.' },
    { step: 4, instruction: 'Pass the tag end of the lighter line back through the loop — exit from the SAME side you entered.' },
    { step: 5, instruction: 'Hold the wraps in place and slowly pull the lighter line\'s standing end. The wraps should slide tight.' },
    { step: 6, instruction: 'Pull both standing lines to test. Trim the tag ends.' },
  ],
};

// ── Specialty Knots ──────────────────────────

const BIMINI_TWIST: FishingKnot = {
  id: 'bimini_twist',
  name: 'Bimini Twist',
  category: 'specialty',
  categoryLabel: 'Specialty / Offshore',
  difficulty: 'advanced',
  strengthPct: 100,
  bestFor: ['offshore trolling', 'double line', 'IGFA records', 'heavy game fish'],
  useCases: 'Creates a doubled line section at nearly 100% strength — the only knot that doesn\'t weaken the line. Required for IGFA record catches. The foundation for offshore trolling leader systems.',
  steps: [
    { step: 1, instruction: 'Double about 3 feet of line. Insert your hand through the loop and spin it 20-25 times to create tight twists.' },
    { step: 2, instruction: 'Spread the doubled lines apart with your knees or a post while holding tension on the tag end.' },
    { step: 3, instruction: 'Slowly let the tag end roll over the twists — it should jump down and wrap around them neatly.', tip: 'This is the critical step. Feed it slowly and let the wraps lay perfectly. Don\'t rush.' },
    { step: 4, instruction: 'Once the tag end has rolled down to the base of the loop, make a half hitch around one leg of the loop to lock it.' },
    { step: 5, instruction: 'Make 4-5 half hitches around BOTH legs of the loop for security.' },
    { step: 6, instruction: 'Trim the tag end. You now have a doubled section of line at full strength.', tip: 'The doubled section is what you tie your wind-on leader or snap swivel to.' },
  ],
};

const SPIDER_HITCH: FishingKnot = {
  id: 'spider_hitch',
  name: 'Spider Hitch',
  category: 'specialty',
  categoryLabel: 'Specialty / Offshore',
  difficulty: 'intermediate',
  strengthPct: 90,
  bestFor: ['double line', 'quick alternative to bimini', 'light tackle offshore'],
  useCases: 'The quick-and-dirty alternative to the Bimini Twist. Creates a doubled line in seconds. Not quite 100% strength but much faster to tie. Good enough for most inshore and light offshore.',
  steps: [
    { step: 1, instruction: 'Double about 2 feet of line to form a long loop.' },
    { step: 2, instruction: 'Hold the loop between your thumb and forefinger, with a small section of doubled line extending beyond your thumb.' },
    { step: 3, instruction: 'Wrap the small loop around your thumb 5 times.' },
    { step: 4, instruction: 'Pass the big loop through the small loop on your thumb.' },
    { step: 5, instruction: 'Moisten and slowly pull the big loop while letting the wraps slide off your thumb.' },
    { step: 6, instruction: 'Pull tight. Trim any tag end. Done — you have a doubled line section.', tip: 'Takes 10 seconds once you get it. Practice on the dock before your trip.' },
  ],
};

const HAYWIRE_TWIST: FishingKnot = {
  id: 'haywire_twist',
  name: 'Haywire Twist',
  category: 'specialty',
  categoryLabel: 'Specialty / Wire',
  difficulty: 'intermediate',
  strengthPct: 95,
  bestFor: ['wire leader', 'toothy fish', 'king mackerel', 'wahoo', 'barracuda'],
  useCases: 'The only proper way to attach a hook or swivel to single-strand wire leader. Essential for targeting king mackerel, wahoo, and barracuda.',
  steps: [
    { step: 1, instruction: 'Pass the wire through the hook eye. Leave 4-5 inches of tag end.' },
    { step: 2, instruction: 'Cross the tag end over the standing wire and twist BOTH wires around each other — 5 haywire twists (an "X" pattern where both wires rotate).', tip: 'Both wires must twist together. If only the tag end wraps, it\'s wrong and will fail.' },
    { step: 3, instruction: 'After the haywire twists, wrap the tag end tightly around the standing wire in a barrel roll — 5-7 tight wraps.' },
    { step: 4, instruction: 'Form a small handle or crank at the end of the tag wire.' },
    { step: 5, instruction: 'Rock the handle back and forth at the base of the barrel wraps until the wire snaps clean.', tip: 'Never cut wire with pliers — it leaves a sharp burr that cuts line. Always break it off by cranking.' },
  ],
};

const SURGEON_KNOT: FishingKnot = {
  id: 'surgeon',
  name: 'Surgeon\'s Knot',
  category: 'leader',
  categoryLabel: 'Leader Connections',
  difficulty: 'beginner',
  strengthPct: 80,
  bestFor: ['quick leader connection', 'dock tying', 'kids', 'tippet to leader'],
  useCases: 'The easiest way to join two lines. Basically a double overhand knot with both lines. Not the strongest but fast and simple. Great for teaching kids to fish or quick dock-side leader repairs.',
  steps: [
    { step: 1, instruction: 'Overlap the two lines by about 8 inches.' },
    { step: 2, instruction: 'Treat both lines as one and tie a simple overhand knot. Don\'t tighten yet.' },
    { step: 3, instruction: 'Pass the loop end and the tag end through the knot one more time (double overhand).' },
    { step: 4, instruction: 'Moisten and pull all four ends simultaneously to tighten.' },
    { step: 5, instruction: 'Trim both tag ends. Done in under 15 seconds.', tip: 'For extra strength, pass through a third time — that\'s a triple surgeon\'s knot.' },
  ],
};

// ── Export All Knots ─────────────────────────

export const FISHING_KNOTS: FishingKnot[] = [
  // Terminal
  PALOMAR,
  IMPROVED_CLINCH,
  UNI_KNOT,
  SNELL,
  // Loops
  LOOP_KNOT,
  DROPPER_LOOP,
  // Line-to-Line
  DOUBLE_UNI,
  FG_KNOT,
  BLOOD_KNOT,
  // Leader
  ALBRIGHT,
  SURGEON_KNOT,
  // Specialty
  BIMINI_TWIST,
  SPIDER_HITCH,
  HAYWIRE_TWIST,
];

// ── Category groups for UI ───────────────────
export const KNOT_CATEGORIES = [
  { id: 'terminal',     label: 'Hook / Lure',        count: 4 },
  { id: 'loop',         label: 'Loop Knots',         count: 2 },
  { id: 'line_to_line', label: 'Line-to-Line',       count: 3 },
  { id: 'leader',       label: 'Leader Connections',  count: 2 },
  { id: 'specialty',    label: 'Specialty / Offshore', count: 3 },
] as const;
