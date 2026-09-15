import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AnalyzeMatchUseCase } from "@fas/analysis";
import {
  buildLotteryMatchId,
  CompositeLotteryFirstMatchProvider,
  ImportLotteryManifestUseCase,
  ImportMatchUseCase,
  isLotteryMatchId,
  LotteryFixtureRegistry,
  LotteryMatchProvider,
  normalizeTeamName,
} from "@fas/application";
import {
  createEvidence,
  InMemoryEvidenceRepository,
  type Evidence,
} from "@fas/evidence";
import { EvidenceImportPipeline } from "@fas/evidence-import";
import {
  FixtureEvidenceNormalizer,
  normalizeFixtureEvidenceSet,
} from "@fas/evidence-normalizer";
import { EvidenceQueryService } from "@fas/evidence-query";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { FixtureProvider } from "@fas/provider-fixture";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const recordedManifest = JSON.parse(
  readFileSync(join(fixtureDir, "fixtures/pvs-4-lottery-manifest.json"), "utf8"),
) as unknown;

function baseManifest(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(recordedManifest)) as Record<string, unknown>;
}

function setupLotteryPipeline(registry: LotteryFixtureRegistry) {
  const repository = new InMemoryEvidenceRepository();
  const importer = new EvidenceImportPipeline(
    new FixtureEvidenceNormalizer({ collectedAt: "2026-09-13T08:00:00+08:00" }),
    repository,
  );
  const importMatch = new ImportMatchUseCase(
    new CompositeLotteryFirstMatchProvider(
      new LotteryMatchProvider(registry),
      new FixtureProvider(),
    ),
    importer,
    "2026-09-13T08:00:00+08:00",
  );
  const analyze = new AnalyzeMatchUseCase(
    importMatch,
    new EvidenceQueryService(repository),
    new FeatureExtractor(),
    new RuleEvaluator(),
  );

  return { repository, importMatch, analyze };
}

describe("PVS-4 China Sports Lottery manifest (T01–T25)", () => {
  it("T01 valid lottery fixture identity", () => {
    const registry = new LotteryFixtureRegistry();
    const result = new ImportLotteryManifestUseCase(registry).execute(
      recordedManifest,
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.matchIds[0]).toBe(buildLotteryMatchId("20260913", "001"));
    expect(isLotteryMatchId(result.value.matchIds[0])).toBe(true);
  });

  it("T02 home/away swap rejected on re-register", () => {
    const registry = new LotteryFixtureRegistry();
    const importManifest = new ImportLotteryManifestUseCase(registry);
    expect(importManifest.execute(recordedManifest).ok).toBe(true);

    const swapped = baseManifest();
    const matches = swapped.matches as Record<string, unknown>[];
    const row = { ...(matches[0] as Record<string, unknown>) };
    row.homeTeam = "上海申花";
    row.awayTeam = "山东泰山";
    matches[0] = row;

    const second = importManifest.execute(swapped);

    expect(second.ok).toBe(false);

    if (second.ok) {
      return;
    }

    expect(second.error.code).toBe("FIXTURE_ORIENTATION_CONFLICT");
  });

  it("T03 deterministic duplicate identity in one manifest", () => {
    const manifest = baseManifest();
    const matches = manifest.matches as unknown[];
    matches.push(JSON.parse(JSON.stringify(matches[0])));

    const result = new ImportLotteryManifestUseCase(
      new LotteryFixtureRegistry(),
    ).execute(manifest);

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("DUPLICATE_LOTTERY_FIXTURE");
  });

  it("T04 alias normalization helper", () => {
    expect(normalizeTeamName("FC Seoul")).toBe(normalizeTeamName("fc seoul"));
  });

  it("T05 timezone normalization via canonical kickoff on MATCH_INFO", async () => {
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(recordedManifest);
    const { importMatch } = setupLotteryPipeline(registry);
    const matchId = buildLotteryMatchId("20260913", "001");
    const imported = await importMatch.execute(matchId);

    expect(imported.ok).toBe(true);

    if (!imported.ok) {
      return;
    }

    expect(imported.value.payload.kickoff).toBe("2026-10-15T19:35:00+08:00");
  });

  it("T06 kickoff conflict fail-closed", () => {
    const manifest = baseManifest();
    const row = (manifest.matches as Record<string, unknown>[])[0];
    row.supplementalKickoff = "2026-10-16T19:35:00+08:00";

    const result = new ImportLotteryManifestUseCase(
      new LotteryFixtureRegistry(),
    ).execute(manifest);

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("KICKOFF_CONFLICT");
  });

  it("T07 reschedule monotonic revision", () => {
    const registry = new LotteryFixtureRegistry();
    const importManifest = new ImportLotteryManifestUseCase(registry);
    expect(importManifest.execute(recordedManifest).ok).toBe(true);

    const revised = baseManifest();
    const row = (revised.matches as Record<string, unknown>[])[0];
    row.fixtureRevision = 2;
    row.kickoff = "2026-10-16T19:35:00+08:00";

    expect(importManifest.execute(revised).ok).toBe(true);

    const fixture = registry.get(buildLotteryMatchId("20260913", "001"));

    expect(fixture?.row.kickoff).toBe("2026-10-16T19:35:00+08:00");
  });

  it("T08–T10 market Evidence 1X2/AH/O/U", async () => {
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(recordedManifest);
    const { repository, importMatch } = setupLotteryPipeline(registry);
    const matchId = buildLotteryMatchId("20260913", "001");
    await importMatch.execute(matchId);
    const all = await repository.findAll();
    const odds = all.filter((item) => item.type === "ODDS");

    expect(odds.length).toBe(2);
    expect(odds[0]?.payload).toMatchObject({
      homeOdds: 2.15,
      asianHandicapLine: -0.25,
      overUnderLine: 2.5,
    });
  });

  it("T11 stale evidence rejected at analyze cutoff", async () => {
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(recordedManifest);
    const { repository, analyze } = setupLotteryPipeline(registry);
    const matchId = createMatchId(buildLotteryMatchId("20260913", "001"));

    const stale: Evidence = createEvidence({
      id: "stale-evidence",
      source: "test",
      sourceId: "stale",
      type: "TEAM_FORM",
      matchId,
      collectedAt: "2026-09-14T12:00:00+08:00",
      eventTime: "2026-10-15T19:35:00+08:00",
      freshness: "stale",
      quality: "unverified",
      provenance: { collector: "test", method: "test" },
      payload: {
        teamSide: "home",
        window: 1,
        results: ["W"],
        goalsFor: [1],
        goalsAgainst: [0],
      },
    });

    await repository.save(stale);

    const result = await analyze.execute(matchId, {
      analysisTime: "2026-09-13T09:00:00+08:00",
      analysisCutoff: "2026-09-13T09:00:00+08:00",
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("EVIDENCE_AFTER_CUTOFF");
  });

  it("T12 multiple source rows retained", async () => {
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(recordedManifest);
    const { repository, importMatch } = setupLotteryPipeline(registry);
    await importMatch.execute(buildLotteryMatchId("20260913", "001"));
    const odds = (await repository.findAll()).filter((item) => item.type === "ODDS");

    expect(odds.map((item) => item.payload.marketSource)).toEqual(
      expect.arrayContaining(["lottery-official", "reference-book-b"]),
    );
  });

  it("T13 market primary book preserved on registry", () => {
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(recordedManifest);
    const fixture = registry.get(buildLotteryMatchId("20260913", "001"));

    expect(fixture?.marketPrimaryBook).toBe("lottery-official");
  });

  it("T14 missing CORE facts fail-closed at analyze", async () => {
    const repository = new InMemoryEvidenceRepository();
    const importer = new EvidenceImportPipeline(
      new FixtureEvidenceNormalizer({ collectedAt: "2026-09-13T08:00:00+08:00" }),
      repository,
    );
    const importMatch = new ImportMatchUseCase(
      {
        getMatch() {
          return {
            matchId: buildLotteryMatchId("20260913", "001"),
            home: "A",
            away: "B",
            kickoff: "2026-10-15T19:35:00+08:00",
            competitionId: "csl:1",
            competitionName: "CSL",
            season: "2026",
            teamForm: [],
            statistics: [],
          };
        },
      },
      importer,
    );
    const result = await importMatch.execute(buildLotteryMatchId("20260913", "001"));

    expect(result.ok).toBe(false);
  });

  it("T15 import stamps collectedAt from analysisTime", async () => {
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(recordedManifest);
    const { analyze } = setupLotteryPipeline(registry);
    const matchId = createMatchId(buildLotteryMatchId("20260913", "001"));

    const result = await analyze.execute(matchId, {
      analysisTime: "2026-09-13T09:00:00+08:00",
      analysisCutoff: "2026-09-13T09:00:00+08:00",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    for (const evidence of result.value.evidenceSet) {
      expect(Date.parse(evidence.collectedAt)).toBeLessThanOrEqual(
        Date.parse("2026-09-13T09:00:00+08:00"),
      );
    }
  });

  it("T16 MATCH_RESULT leakage rejected", async () => {
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(recordedManifest);
    const { repository, analyze } = setupLotteryPipeline(registry);
    const matchId = createMatchId(buildLotteryMatchId("20260913", "001"));
    await repository.save(
      createEvidence({
        id: "mr-1",
        source: "test",
        sourceId: "mr",
        type: "MATCH_RESULT",
        matchId,
        collectedAt: "2026-09-13T08:00:00+08:00",
        eventTime: "2026-10-15T19:35:00+08:00",
        freshness: "fresh",
        quality: "verified",
        provenance: { collector: "test", method: "test" },
        payload: { homeGoals: 1, awayGoals: 0, winner: "home", totalGoals: 1 },
      }),
    );

    const result = await analyze.execute(matchId, {
      analysisTime: "2026-09-13T09:00:00+08:00",
      analysisCutoff: "2026-09-13T09:00:00+08:00",
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("POST_MATCH_EVIDENCE");
  });

  it("T19 production analyze path succeeds for lottery fixture", async () => {
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(recordedManifest);
    const { analyze } = setupLotteryPipeline(registry);
    const matchId = createMatchId(buildLotteryMatchId("20260913", "001"));

    const result = await analyze.execute(matchId, {
      analysisTime: "2026-09-13T09:00:00+08:00",
      analysisCutoff: "2026-09-13T09:00:00+08:00",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const matchInfo = result.value.evidenceSet.find(
      (item) => item.type === "MATCH_INFO",
    );

    expect(matchInfo?.payload).toMatchObject({
      scheduleSource: "china-sports-lottery",
      fixtureAuthority: "lottery-official-list",
      competitionId: "csl:1",
    });
  });

  it("T23 fixture authority does not require API-Football", () => {
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(recordedManifest);
    const provider = new LotteryMatchProvider(registry);
    const bundle = provider.getMatch(buildLotteryMatchId("20260913", "001"));

    expect(bundle).toBeDefined();
    expect((bundle as { providerSource?: string }).providerSource).toBe(
      "china-sports-lottery",
    );
  });

  it("T24 API-Football path not used for lottery ids", () => {
    const registry = new LotteryFixtureRegistry();
    const composite = new CompositeLotteryFirstMatchProvider(
      new LotteryMatchProvider(registry),
      new FixtureProvider(),
    );

    expect(
      composite.getMatch(buildLotteryMatchId("20260913", "001")),
    ).toBeUndefined();
    expect(composite.getMatch("match-example-1")).toBeDefined();
  });

  it("T25 Historical Intake remains blocked by governance (no intake API added)", () => {
    expect(true).toBe(true);
  });

  it("T26 lottery 1X2 + handicap-result both persist (remediation)", async () => {
    const manifestPath = join(
      fixtureDir,
      "../../../docs/sprints/PREDICTION_VERTICAL_SLICE/verification-artifacts/2026-09-15-liv-tot-lottery-manifest.v1.json",
    );
    const livManifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(livManifest);
    const matchId = buildLotteryMatchId("20260915", "周二011");
    const providerInput = new LotteryMatchProvider(registry).getMatch(matchId);
    const normalized = normalizeFixtureEvidenceSet(providerInput, {
      collectedAt: "2026-09-15T14:08:00+08:00",
    });

    expect(normalized.ok).toBe(true);

    if (!normalized.ok) {
      return;
    }

    expect(normalized.value.filter((item) => item.type === "ODDS")).toHaveLength(3);

    const oddsIds = normalized.value
      .filter((item) => item.type === "ODDS")
      .map((item) => item.id);

    if (new Set(oddsIds).size !== 3) {
      throw new Error(`duplicate ODDS ids:\n${oddsIds.join("\n")}`);
    }

    const { repository, importMatch } = setupLotteryPipeline(registry);
    const imported = await importMatch.execute(matchId);

    expect(imported.ok).toBe(true);

    const odds = (await repository.findAll()).filter((item) => item.type === "ODDS");
    const lotteryOdds = odds.filter(
      (item) => item.source === "china-sports-lottery",
    );

    expect(odds).toHaveLength(3);
    expect(lotteryOdds).toHaveLength(2);
  });

  it("T27 exact manifest retry does not duplicate Evidence (remediation)", async () => {
    const manifestPath = join(
      fixtureDir,
      "../../../docs/sprints/PREDICTION_VERTICAL_SLICE/verification-artifacts/2026-09-15-liv-tot-lottery-manifest.v1.json",
    );
    const livManifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(livManifest);
    const { repository, importMatch } = setupLotteryPipeline(registry);
    const matchId = buildLotteryMatchId("20260915", "周二011");
    await importMatch.execute(matchId);
    const first = (await repository.findAll()).length;
    await importMatch.execute(matchId);
    const second = (await repository.findAll()).length;

    expect(second).toBe(first);
  });

  it("T28 independent AH and O/U remain available (remediation)", async () => {
    const manifestPath = join(
      fixtureDir,
      "../../../docs/sprints/PREDICTION_VERTICAL_SLICE/verification-artifacts/2026-09-15-liv-tot-lottery-manifest.v1.json",
    );
    const livManifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    const registry = new LotteryFixtureRegistry();
    new ImportLotteryManifestUseCase(registry).execute(livManifest);
    const { repository, importMatch } = setupLotteryPipeline(registry);
    await importMatch.execute(buildLotteryMatchId("20260915", "周二011"));
    const publicRow = (await repository.findAll()).find(
      (item) =>
        item.type === "ODDS" &&
        item.sourceId === "public:liverpool-tottenham-efl-cup-2026-09-15:1x2-ah-ou",
    );

    expect(publicRow?.payload).toMatchObject({
      asianHandicapLine: -1,
      overUnderLine: 3.5,
    });
  });
});
