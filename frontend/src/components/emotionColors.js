/**
 * Bubble color per (x, y). Each quadrant has its own hand-tuned hue/sat/light
 * map, and neighbouring quadrants are designed so that hues meet cleanly
 * across the axes:
 *
 *   Q1 top-right  (pleasant, high energy)   golden yellow → pale yellow
 *   Q2 top-left   (unpleasant, high energy) red-orange near y-axis, cool red / burgundy at far left; red-violet at bottom
 *   Q3 bottom-left (unpleasant, low energy) blue-violet near y-axis top → deep blue (#305DD9) corner; lighter cyan-blue (#3095D9) near y-axis at the bottom
 *   Q4 bottom-right (pleasant, low energy)  yellow-green near y-axis → teal / mint (#00D6A3) corner
 *
 * The transitions read as: yellow → golden (Q1) → red-orange → cool red (Q2)
 * → red-violet → blue-violet → deep blue (Q3) → cyan-blue → teal (Q4) →
 * yellow-green → yellow.
 */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Bilinear interpolation using four corner values on a unit square.
// bl = bottom-left (nx=0, ny=0), br = (nx=1, ny=0), tl = (nx=0, ny=1), tr = (nx=1, ny=1)
function bilerp(bl, br, tl, tr, nx, ny) {
  const bot = lerp(bl, br, nx);
  const top = lerp(tl, tr, nx);
  return lerp(bot, top, ny);
}

export function emotionColor(x, y) {
  // Coords are always non-zero (skipped on the grid).
  const dx = Math.abs(x); // 1..7
  const dy = Math.abs(y); // 1..7
  const nx = (dx - 1) / 6; // 0 near y-axis, 1 far
  const ny = (dy - 1) / 6; // 0 near x-axis, 1 far

  let hue, sat, light;

  if (x > 0 && y > 0) {
    // Q1: gold at (+1,+7) rotating -90° through pale yellow at (+1,+1),
    // and yellow-green pushed to the far right (+7,+1).
    hue = bilerp(55, 85, 40, 50, nx, ny);
    sat = bilerp(60, 55, 90, 78, nx, ny);
    light = bilerp(72, 72, 58, 65, nx, ny);
  } else if (x < 0 && y > 0) {
    // Q2: clean bridge between the yellow (Q1) and blue (Q3) quadrants.
    // Near y-axis (-1 col) reads red / red-orange; far left (-7 col) reads
    // magenta / pink-magenta so it flows into Q3's blue-violets.
    // Unwrapped hues so bilerp is monotonic through 0/360.
    const bl = 15; //  (-1,+1)  red-orange
    const tl = 5; //   (-1,+7)  pure red
    const br = -40; // (-7,+1)  magenta (320°)
    const tr = -25; // (-7,+7)  pink-magenta (335°)
    hue = (bilerp(bl, br, tl, tr, nx, ny) + 360) % 360;
    sat = bilerp(70, 65, 82, 72, nx, ny);
    light = bilerp(62, 60, 58, 55, nx, ny);
  } else if (x < 0 && y < 0) {
    // Q3: the near-origin row (-1) picks up the mid cyan-blue that used to
    // live on the -7 row, and the -7 row now reads as DEEP JEWEL TONES —
    // sapphire on the near-y-axis side, amethyst / indigo at the corner.
    const bl = 195; // (-1,-1)  medium cyan-blue (moved up from -7 row)
    const br = 235; // (-7,-1)  medium blue (less violet than before)
    const tl = 215; // (-1,-7)  deep sapphire jewel tone
    const tr = 246; // (-7,-7)  deep sapphire-indigo (capped; no more amethyst purple)
    hue = bilerp(bl, br, tl, tr, nx, ny);
    sat = bilerp(58, 62, 80, 75, nx, ny);
    // Top row medium; bottom row deep jewel tones — floor at ~34% lightness.
    light = bilerp(60, 56, 36, 34, nx, ny);
  } else {
    // Q4: the near-origin row (-1) inherits the teal / pure-green that used
    // to sit on the -7 row, and the -7 row is DEEP JEWEL TONES — deep teal
    // near the y-axis and deep emerald at the far bottom-right corner.
    const bl = 162; // (+1,-1)  deep teal (matches previous +1,-3 — no more too-light)
    const br = 120; // (+7,-1)  pure green (unchanged, as requested)
    const tl = 175; // (+1,-7)  deep teal jewel tone
    const tr = 145; // (+7,-7)  deep emerald jewel tone
    hue = bilerp(bl, br, tl, tr, nx, ny);
    sat = bilerp(65, 68, 78, 80, nx, ny);
    // Bottom row lifted so it reads jewel-toned, not muddy-dark.
    light = bilerp(53, 58, 40, 38, nx, ny);
  }

  return {
    color: `hsl(${hue}, ${sat}%, ${light}%)`,
    glow: `hsla(${hue}, ${sat}%, ${light}%, 0.55)`,
  };
}
