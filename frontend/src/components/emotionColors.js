/**
 * Map an emotion's (x, y) grid coordinate to bubble colors, using a
 * hand-designed hue palette per quadrant:
 *
 *  Q1 (x+, y+)  High-energy pleasant
 *     y=+7 → golden yellow / yellow-orange (~40°)
 *     y=+1 → pale yellow-green (~85°)
 *     No blue.
 *
 *  Q2 (x-, y+)  High-energy unpleasant
 *     y=+7 → red / red-orange (~10°)
 *     y=+1 → red-violet (~335°)
 *     No green.
 *
 *  Q3 (x-, y-)  Low-energy unpleasant
 *     y=-7 → darker indigo (~245°), heavy/sad
 *     y=-1 → blue-violet (~270°), lighter
 *     Less green, less refreshing.
 *
 *  Q4 (x+, y-)  Low-energy pleasant
 *     y=-7 → teal / mint (~165°), reference #00D6A3
 *     y=-1 → yellow-green (~90°)
 *     No red.
 *
 * x-axis (distance from y=0) drives saturation & richness: bubbles closer
 * to the y-axis are paler; bubbles further out are more saturated.
 */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function emotionColor(x, y) {
  // Coords are always non-zero (skipped on the grid).
  const dx = Math.abs(x); // 1..7
  const dy = Math.abs(y); // 1..7
  const nx = (dx - 1) / 6; // 0 at |x|=1 (near y-axis), 1 at |x|=7 (far)
  const ny = (dy - 1) / 6; // 0 at |y|=1 (near x-axis), 1 at |y|=7 (far)

  let hue, sat, light;

  if (x > 0 && y > 0) {
    // Q1: golden-yellow (top) → pale yellow-green (near y=0)
    hue = lerp(85, 40, ny); // 85 near y=0, 40 at y=+7
    sat = lerp(50, 85, ny * 0.55 + nx * 0.45);
    light = lerp(72, 58, ny * 0.6 + nx * 0.4);
  } else if (x < 0 && y > 0) {
    // Q2: red-violet (near y=0) → red / red-orange (top). Short-arc interp:
    // 335° → 10° going forward through 360/0.
    const hMin = 335;
    const hMax = 10 + 360; // 370 unwrapped, then mod
    hue = (lerp(hMin, hMax, ny)) % 360;
    sat = lerp(55, 82, ny * 0.55 + nx * 0.45);
    light = lerp(68, 54, ny * 0.55 + nx * 0.45);
  } else if (x < 0 && y < 0) {
    // Q3: blue-violet (near y=0) → deep blue (bottom, ~#305DD9). Heavier but
    // not muddy — keep enough lightness for contrast on the dark theme.
    hue = lerp(250, 224, ny); // 250 near y=0, 224 at y=-7 (matches #305DD9)
    sat = lerp(55, 72, ny * 0.5 + nx * 0.5);
    // Bottom stays in the mid range so bubbles remain visible on dark bg.
    light = lerp(68, 52, ny * 0.6 + nx * 0.4);
  } else {
    // Q4: yellow-green (near y=0) → teal / mint (bottom, #00D6A3 = ~165°).
    hue = lerp(90, 165, ny); // 90 near y=0, 165 at y=-7
    sat = lerp(45, 78, ny * 0.55 + nx * 0.45);
    light = lerp(70, 55, ny * 0.5 + nx * 0.5);
  }

  const color = `hsl(${hue}, ${sat}%, ${light}%)`;
  const glow = `hsla(${hue}, ${sat}%, ${light}%, 0.55)`;
  return { color, glow };
}
