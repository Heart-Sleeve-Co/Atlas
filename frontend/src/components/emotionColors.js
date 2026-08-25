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
    // Q1 (rotated -90°): darkest gold at (+1,+7), fading to paler yellows
    // outward. bl = (1,1), br = (7,1), tl = (1,7), tr = (7,7).
    hue = bilerp(70, 60, 40, 50, nx, ny);
    sat = bilerp(62, 52, 90, 78, nx, ny);
    light = bilerp(65, 72, 58, 62, nx, ny);
  } else if (x < 0 && y > 0) {
    // Q2: red at top, red-orange near y-axis, cool red / burgundy at far
    // left, red-violet at bottom for a smooth blend into Q3.
    //   top near y-axis (right side of Q2): red-orange 15°
    //   top far left: cool red 355° (via short arc through 0)
    //   bottom near y-axis: red-violet 340°
    //   bottom far left: burgundy 330°
    // Use unwrapped extended range so lerp is monotonic through 0/360.
    const tl = -5; // 355°  (unwrapped)
    const tr = 15; // 15°
    const bl = -30; // 330°
    const br = -20; // 340°
    hue = (bilerp(bl, br, tl, tr, nx, ny) + 360) % 360;
    sat = bilerp(50, 72, 65, 85, nx, ny);
    light = bilerp(66, 58, 60, 55, nx, ny);
  } else if (x < 0 && y < 0) {
    // Q3: blue-violet near y-axis top → deep blue (#305DD9 ≈ h224) corner;
    // lighter cyan-blue (#3095D9 ≈ h200) at the bottom near the y-axis.
    //   top near y-axis (top-right of Q3): blue-violet 260°
    //   top far left: blue-violet 250°
    //   bottom near y-axis: cyan-blue 200°
    //   bottom far left: deep blue 224°
    hue = bilerp(200, 224, 260, 250, nx, ny);
    sat = bilerp(60, 72, 55, 70, nx, ny);
    light = bilerp(62, 52, 68, 55, nx, ny);
  } else {
    // Q4: yellow-green near y-axis → teal / mint (#00D6A3 ≈ h165) corner.
    //   top near y-axis (top-left of Q4, close to origin): yellow-green 95°
    //   top far right: yellow-green 105°
    //   bottom near y-axis: cyan-green 155°
    //   bottom far right: mint 165°
    hue = bilerp(155, 165, 95, 105, nx, ny);
    sat = bilerp(60, 78, 45, 62, nx, ny);
    light = bilerp(64, 58, 70, 62, nx, ny);
  }

  return {
    color: `hsl(${hue}, ${sat}%, ${light}%)`,
    glow: `hsla(${hue}, ${sat}%, ${light}%, 0.55)`,
  };
}
