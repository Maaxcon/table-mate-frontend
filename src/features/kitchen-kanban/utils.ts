export function elapsedMinutes(startedAt: number): number {
  return Math.floor((Date.now() - startedAt) / 60000)
}
