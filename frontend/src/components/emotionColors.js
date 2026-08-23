/**
 * Map an emotion's (x, y) grid coordinate to visual properties.
 * x: -8 unpleasant .. +7 pleasant
 * y: -8 low energy .. +7 high energy
 * Q1 (x+, y+): warm gold/peach — pleasant + high energy
 * Q2 (x-, y+): ember/magenta — unpleasant + high energy
 * Q3 (x-, y-): indigo/deep-blue — unpleasant + low energy
 * Q4 (x+, y-): mint/aqua — pleasant + low energy
 */

// Reference hues per quadrant corner (HSL degrees)
const HUES = {
  Q1: 38, // warm gold
  Q2: 350, // magenta-red
  Q3: 230, // indigo blue
  Q4: 160, // mint/teal
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Circular hue interpolation using shortest arc
function lerpHue(h1, h2, t) {
  const diff = ((((h2 - h1) % 360) + 540) % 360) - 180;
  return (h1 + diff * t + 360) % 360;
}

export function emotionColor(x, y) {
  // Normalize x, y to 0..1
  const nx = (x + 8) / 15; // 0 at x=-8, 1 at x=+7
  const ny = (y + 8) / 15;

  // Blend hue: horizontally between (Q3<->Q4) at bottom, (Q2<->Q1) at top,
  // then vertically between the two horizontal blends.
  const hueBottom = lerpHue(HUES.Q3, HUES.Q4, nx);
  const hueTop = lerpHue(HUES.Q2, HUES.Q1, nx);
  const hue = lerpHue(hueBottom, hueTop, ny);

  // Saturation & lightness — higher energy = more saturated, extremes more vivid
  const distFromCenter = Math.sqrt(
    Math.pow((nx - 0.5) * 2, 2) + Math.pow((ny - 0.5) * 2, 2),
  ); // 0 center, ~1.4 corner
  const vividness = Math.min(1, distFromCenter / 1.2);

  const saturation = lerp(35, 85, vividness);
  const lightness = lerp(72, 60, vividness);

  return {
    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    highlight: `hsl(${hue}, ${Math.min(100, saturation + 10)}%, ${Math.min(90, lightness + 20)}%)`,
    shade: `hsl(${hue}, ${saturation}%, ${Math.max(30, lightness - 22)}%)`,
    glow: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.55)`,
    hue,
  };
}
