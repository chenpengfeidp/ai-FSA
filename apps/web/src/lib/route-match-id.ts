/** Normalize App Router / link match ids (`odds%3A…` → `odds:…`). */
export function decodeRouteMatchId(raw: string): string {
  let current = raw.trim();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(current);

      if (next === current) {
        break;
      }

      current = next;
    } catch {
      break;
    }
  }

  return current;
}
