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
    // Q3: vertically flipped — deepest indigo at (-7,-7) corner, lighter
    // blue-violets along the top (y=-1) near the x-axis, and the cyan-blue
    // (#3095D9 ≈ h200) moved to (-1,-7) at the bottom near the y-axis.
    const bl = 260; // (-1,-1)  blue-violet, light  (was tl before flip)
    const br = 250; // (-7,-1)  blue-violet, medium
    const tl = 200; // (-1,-7)  cyan-blue (#3095D9)
    const tr = 235; // (-7,-7)  deep indigo corner
    hue = bilerp(bl, br, tl, tr, nx, ny);
    sat = bilerp(55, 65, 65, 78, nx, ny);
    // Lightness distinctly drops at the corner for the heavy / sad feel.
    light = bilerp(68, 60, 62, 44, nx, ny);
  } else {
    // Q4: unchanged intent — yellow-greens near the x-axis (top of the
    // quadrant), teal / mint (#00D6A3 ≈ h165) at the bottom corner.
    hue = bilerp(95, 105, 155, 165, nx, ny);
    sat = bilerp(60, 78, 45, 62, nx, ny);
    light = bilerp(64, 58, 70, 62, nx, ny);
  }

  return {
    color: `hsl(${hue}, ${sat}%, ${light}%)`,
    glow: `hsla(${hue}, ${sat}%, ${light}%, 0.55)`,
  };
}
