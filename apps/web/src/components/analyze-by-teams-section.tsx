"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactElement } from "react";
import { zh } from "../copy/zh";
import { MATCH_DETAIL_QUERY_KEY } from "../hooks/match-detail-query-key";
import { useAnalyzeByTeams } from "../hooks/use-analyze-by-teams";
import type { MatchDetailData } from "../hooks/use-match-detail";
import {
  analyzeMatch,
  formatKickoffTime,
  getEvidenceByMatch,
} from "../services/api";
import type {
  AnalyzeByTeamsFailure,
  FixtureDiscoveryCandidateDto,
} from "../types/analysis";
import { ErrorPanel } from "./error-panel";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

async function loadMatchDetailData(matchId: string): Promise<MatchDetailData> {
  const report = await analyzeMatch(matchId);
  const evidence = await getEvidenceByMatch(matchId);

  return Object.freeze({ report, evidence });
}

function FixtureAmbiguityPanel({
  candidates,
  isPending,
  onSelect,
}: Readonly<{
  candidates: readonly FixtureDiscoveryCandidateDto[];
  isPending: boolean;
  onSelect: (matchId: string) => void;
}>): ReactElement {
  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-body font-medium text-amber-950">
        {zh.analyzeByTeams.ambiguousTitle}
      </p>
      <p className="text-sm text-amber-900">{zh.analyzeByTeams.ambiguousHint}</p>
      <ul className="space-y-2">
        {candidates.map((candidate) => (
          <li key={candidate.matchId}>
            <Button
              className="h-auto w-full justify-start whitespace-normal px-4 py-3 text-left"
              disabled={isPending}
              onClick={() => {
                onSelect(candidate.matchId);
              }}
              type="button"
              variant="outline"
            >
              <span className="block font-medium text-foreground">
                {candidate.homeTeam} {zh.matchCard.vs} {candidate.awayTeam}
              </span>
              <span className="mt-1 block text-caption text-muted-foreground">
                {candidate.competition} · {formatKickoffTime(candidate.kickoff)} ·{" "}
                {candidate.matchId}
                {candidate.homeAwaySwapped
                  ? ` · ${zh.analyzeByTeams.swappedOrdering}`
                  : ""}
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function failureMessage(failure: AnalyzeByTeamsFailure): string {
  switch (failure.kind) {
    case "fixture":
      return failure.message;
    case "policy":
      return zh.analyzeByTeams.policyUnavailable(failure.message);
    case "analysis":
      return zh.analyzeByTeams.analysisFailed(failure.message);
    default:
      return failure.message;
  }
}

export function AnalyzeByTeamsSection(): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useAnalyzeByTeams();
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [date, setDate] = useState("");
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<
    readonly FixtureDiscoveryCandidateDto[] | undefined
  >(undefined);
  const [selectedCandidatePending, setSelectedCandidatePending] = useState(false);

  async function navigateWithReport(matchId: string): Promise<void> {
    const data = await loadMatchDetailData(matchId);
    queryClient.setQueryData([MATCH_DETAIL_QUERY_KEY, matchId], data);
    router.push(`/matches/${encodeURIComponent(matchId)}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAmbiguousCandidates(undefined);

    const result = await mutation.mutateAsync({
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      ...(date.trim().length === 0 ? {} : { date: date.trim() }),
    });

    if (!result.ok) {
      if (
        result.failure.kind === "fixture" &&
        result.failure.code === "FIXTURE_AMBIGUOUS" &&
        result.failure.candidates !== undefined
      ) {
        setAmbiguousCandidates(result.failure.candidates);
      }

      return;
    }

    const matchId = result.report.matchId;
    const evidence = await getEvidenceByMatch(matchId);
    queryClient.setQueryData([MATCH_DETAIL_QUERY_KEY, matchId], {
      report: result.report,
      evidence,
    });
    router.push(`/matches/${encodeURIComponent(matchId)}`);
  }

  async function handleCandidateSelect(matchId: string): Promise<void> {
    setSelectedCandidatePending(true);

    try {
      await navigateWithReport(matchId);
    } finally {
      setSelectedCandidatePending(false);
    }
  }

  const isLoading = mutation.isPending || selectedCandidatePending;
  const failure = mutation.data?.ok === false ? mutation.data.failure : undefined;

  return (
    <section
      aria-labelledby="analyze-by-teams-heading"
      className="animate-fade-in scroll-mt-20"
      id="analyze-by-teams"
    >
      <Card className="hover:translate-y-0">
        <CardHeader className="pb-4">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.14em] text-primary">
            <Search aria-hidden="true" className="size-3.5" />
            {zh.analyzeByTeams.eyebrow}
          </p>
          <CardTitle className="text-heading" id="analyze-by-teams-heading">
            {zh.analyzeByTeams.heading}
          </CardTitle>
          <p className="text-body text-muted-foreground">
            {zh.analyzeByTeams.description}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={handleSubmit}
          >
            <label className="space-y-1.5" htmlFor="analyze-by-teams-home">
              <span className="text-caption font-semibold uppercase tracking-wide text-subtle">
                {zh.analyzeByTeams.homeTeam}
              </span>
              <Input
                autoComplete="off"
                disabled={isLoading}
                id="analyze-by-teams-home"
                onChange={(event) => {
                  setHomeTeam(event.target.value);
                }}
                placeholder={zh.analyzeByTeams.homePlaceholder}
                required
                value={homeTeam}
              />
            </label>
            <label className="space-y-1.5" htmlFor="analyze-by-teams-away">
              <span className="text-caption font-semibold uppercase tracking-wide text-subtle">
                {zh.analyzeByTeams.awayTeam}
              </span>
              <Input
                autoComplete="off"
                disabled={isLoading}
                id="analyze-by-teams-away"
                onChange={(event) => {
                  setAwayTeam(event.target.value);
                }}
                placeholder={zh.analyzeByTeams.awayPlaceholder}
                required
                value={awayTeam}
              />
            </label>
            <label className="space-y-1.5" htmlFor="analyze-by-teams-date">
              <span className="text-caption font-semibold uppercase tracking-wide text-subtle">
                {zh.analyzeByTeams.dateOptional}
              </span>
              <Input
                disabled={isLoading}
                id="analyze-by-teams-date"
                onChange={(event) => {
                  setDate(event.target.value);
                }}
                type="date"
                value={date}
              />
            </label>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={isLoading}
                type="submit"
                variant="primary"
              >
                {isLoading ? zh.analyzeByTeams.analyzing : zh.analyzeByTeams.submit}
              </Button>
            </div>
          </form>

          {isLoading ? (
            <p className="text-body text-muted-foreground" role="status">
              {zh.analyzeByTeams.loadingPipeline}
            </p>
          ) : null}

          {failure !== undefined && ambiguousCandidates === undefined ? (
            <ErrorPanel message={failureMessage(failure)} />
          ) : null}

          {ambiguousCandidates !== undefined ? (
            <FixtureAmbiguityPanel
              candidates={ambiguousCandidates}
              isPending={selectedCandidatePending}
              onSelect={handleCandidateSelect}
            />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
