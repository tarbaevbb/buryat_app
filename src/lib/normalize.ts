export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[!?.,:;"'«»()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
