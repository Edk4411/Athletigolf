export function formatWater(ml: number): string {
  if (ml < 1000) {
    return `${ml} ml`;
  }
  return `${ml / 1000} L`;
}
