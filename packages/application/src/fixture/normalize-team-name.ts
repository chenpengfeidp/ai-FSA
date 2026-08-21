const TEAM_PREFIX_TOKENS = ["fc", "afc", "sc", "cf"] as const;

const TEAM_SUFFIX_TOKENS = [
  "hyundai fc",
  "hyundai motors",
  "fc",
  "afc",
  "sc",
  "cf",
] as const;

/**
 * Deterministic team-name normalization for fixture catalog lookup.
 * No fuzzy matching — only whitespace, case, punctuation, and common tokens.
 */
export function normalizeTeamName(name: string): string {
  let normalized = name
    .trim()
    .toLowerCase()
    .replace(/[.'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const prefix of TEAM_PREFIX_TOKENS) {
    const token = `${prefix} `;

    if (normalized.startsWith(token)) {
      normalized = normalized.slice(token.length).trim();
      break;
    }
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (const suffix of TEAM_SUFFIX_TOKENS) {
      const token = ` ${suffix}`;

      if (normalized.endsWith(token)) {
        normalized = normalized.slice(0, -token.length).trim();
        changed = true;
        break;
      }
    }
  }

  return normalized;
}
