import type { MatchSummary } from "../types/match-center";

export const DEFAULT_HORIZON_DAYS = 3;

/** Local calendar YYYY-MM-DD. */
export function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Inclusive local-date window: start .. start+(horizonDays-1). */
export function windowEndDate(startDate: string, horizonDays: number): string {
  const [year, month, day] = startDate.split("-").map(Number);
  const start = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return formatLocalDate(addLocalDays(start, Math.max(1, horizonDays) - 1));
}

export function kickoffLocalDate(kickoffIso: string): string | undefined {
  const parsed = new Date(kickoffIso);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return formatLocalDate(parsed);
}

/** Earliest local kickoff date among rows that pass the demo filter. */
export function earliestMatchLocalDate(
  matches: readonly MatchSummary[],
  options: { readonly includeDemos: boolean },
): string | undefined {
  let earliest: string | undefined;

  for (const match of matches) {
    if (!options.includeDemos && match.providerSource === "fixture") {
      continue;
    }

    const localDate = kickoffLocalDate(match.kickoff);

    if (localDate === undefined) {
      continue;
    }

    if (earliest === undefined || localDate < earliest) {
      earliest = localDate;
    }
  }

  return earliest;
}

export function filterMatchCenterRows(
  matches: readonly MatchSummary[],
  options: {
    readonly startDate: string;
    readonly horizonDays: number;
    readonly includeDemos: boolean;
  },
): readonly MatchSummary[] {
  const endDate = windowEndDate(options.startDate, options.horizonDays);

  const filtered = matches.filter((match) => {
    if (!options.includeDemos && match.providerSource === "fixture") {
      return false;
    }

    const localDate = kickoffLocalDate(match.kickoff);

    if (localDate === undefined) {
      return false;
    }

    return localDate >= options.startDate && localDate <= endDate;
  });

  // Analyzable rows first so Match Center does not bury “分析” under incomplete cards.
  return Object.freeze(
    [...filtered].sort((left, right) => {
      const leftRank = left.analyzable === false ? 1 : 0;
      const rightRank = right.analyzable === false ? 1 : 0;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.kickoff.localeCompare(right.kickoff);
    }),
  );
}
