export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

// Sigmoid normalization for better distribution
export function sigmoidNormalize(
  value: number,
  midpoint: number,
  steepness: number = 0.1
): number {
  return 1 / (1 + Math.exp(-steepness * (value - midpoint)));
}

// Logarithmic scale for exponential metrics (stars, contributors)
export function logNormalize(value: number, base: number = 10): number {
  if (value <= 1) return 0;
  const logValue = Math.log(value) / Math.log(base);
  return clamp(logValue / 5, 0, 1); // 10^5 = 100k is max
}
