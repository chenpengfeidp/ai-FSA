import {
  LOCAL_DETERMINISTIC_NARRATIVE_PROVIDER_ID,
  type NarrativeDraft,
} from "@fas/ai-provider";
import type { AnalysisResult } from "@fas/analysis";
import type { Feature } from "@fas/feature";
import { composeNarrativePrompt } from "@fas/prompt";
import type { RuleResult } from "@fas/rule";

function teamName(
  features: readonly Feature[],
  name: "awayTeam" | "homeTeam",
): string {
  const feature = features.find((entry) => entry.name === name);
  return typeof feature?.value === "string" ? feature.value : name;
}

function numericFeature(
  features: readonly Feature[],
  name: Feature["name"],
): number | undefined {
  const value = features.find((entry) => entry.name === name)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isPresenceRule(rule: RuleResult): boolean {
  return (
    rule.ruleName === "HOME_TEAM_PRESENT" ||
    rule.ruleName === "AWAY_TEAM_PRESENT" ||
    rule.ruleName === "KICKOFF_PRESENT"
  );
}

function p1PassRules(rules: readonly RuleResult[]): readonly RuleResult[] {
  return rules.filter(
    (rule) =>
      rule.status === "PASS" && !isPresenceRule(rule) && rule.channel !== "none",
  );
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function winnerLabel(
  winner: "away" | "draw" | "home",
  homeTeam: string,
  awayTeam: string,
): string {
  if (winner === "home") {
    return homeTeam;
  }

  if (winner === "away") {
    return awayTeam;
  }

  return "Draw";
}

/**
 * Local structured Match Report narrative (no LLM).
 * Every claim cites a Rule id, Feature name, or sealed scenario/confidence field.
 */
export function buildMvpIntelligenceNarrative(
  analysis: AnalysisResult,
  reportId: string,
): NarrativeDraft {
  const homeTeam = teamName(analysis.features, "homeTeam");
  const awayTeam = teamName(analysis.features, "awayTeam");
  const matchedRuleNames = analysis.ruleResults
    .filter((rule) => rule.status === "PASS" && !isPresenceRule(rule))
    .map((rule) => rule.ruleName);
  const composition = composeNarrativePrompt({
    reportId,
    matchId: analysis.matchId,
    homeTeam,
    awayTeam,
    recommendation: analysis.projection.recommendation,
    pHome: analysis.projection.pHome,
    pDraw: analysis.projection.pDraw,
    pAway: analysis.projection.pAway,
    confidence: analysis.projection.confidence,
    limitations: analysis.projection.limitations,
    matchedRuleNames,
    marketConflict: analysis.projection.limitations.some((line) =>
      line.includes("Market lean conflicts with football-model directional lean"),
    ),
    calibrationArtifactId: analysis.projection.calibrationArtifactId,
    calibrationStatus: analysis.projection.calibrationStatus,
    calibrationQualified: analysis.projection.calibrationQualified,
    deterministicChecksum: analysis.projection.checksum,
  });

  const most = analysis.scenarios.mostLikely;
  const second = analysis.scenarios.secondLikely;
  const upset = analysis.scenarios.upset;
  const confidence = analysis.intelligenceConfidence;
  const keyFactors = p1PassRules(analysis.ruleResults)
    .slice(0, 5)
    .map(
      (rule) =>
        `${rule.ruleName} (${rule.ruleId}) — ${rule.explanation} Features: ${rule.sourceFeatureIds.join(", ") || "(none)"}.`,
    );

  const attackHome = numericFeature(analysis.features, "attackRatingHome");
  const attackAway = numericFeature(analysis.features, "attackRatingAway");
  const defenseHome = numericFeature(analysis.features, "defenseRatingHome");
  const defenseAway = numericFeature(analysis.features, "defenseRatingAway");
  const formHome = numericFeature(analysis.features, "recentFormHome");
  const formAway = numericFeature(analysis.features, "recentFormAway");
  const formAtHomeHome = numericFeature(analysis.features, "formAtHomeHome");
  const formOnRoadAway = numericFeature(analysis.features, "formOnRoadAway");
  const goalsScoredHome = numericFeature(analysis.features, "goalsScoredRateHome");
  const goalsScoredAway = numericFeature(analysis.features, "goalsScoredRateAway");
  const attackEffHome = numericFeature(analysis.features, "attackEfficiencyHome");
  const attackEffAway = numericFeature(analysis.features, "attackEfficiencyAway");
  const possessionHome = numericFeature(analysis.features, "possessionHome");
  const possessionAway = numericFeature(analysis.features, "possessionAway");
  const chanceHome = numericFeature(analysis.features, "chanceCreationHome");
  const chanceAway = numericFeature(analysis.features, "chanceCreationAway");
  const disciplineHome = numericFeature(analysis.features, "disciplineRiskHome");
  const disciplineAway = numericFeature(analysis.features, "disciplineRiskAway");
  const xgAttackHome = numericFeature(analysis.features, "xgAttackQualityHome");
  const xgAttackAway = numericFeature(analysis.features, "xgAttackQualityAway");
  const xgDefenseHome = numericFeature(analysis.features, "xgDefenseQualityHome");
  const xgDefenseAway = numericFeature(analysis.features, "xgDefenseQualityAway");
  const xgDominance = numericFeature(analysis.features, "xgDominance");
  const finishingHome = numericFeature(analysis.features, "finishingEfficiencyHome");
  const finishingAway = numericFeature(analysis.features, "finishingEfficiencyAway");
  const fatigueHome = numericFeature(analysis.features, "fatigueIndexHome");
  const fatigueAway = numericFeature(analysis.features, "fatigueIndexAway");
  const scheduleAdvantage = numericFeature(analysis.features, "scheduleAdvantage");
  const homeStability = numericFeature(analysis.features, "homeStability");
  const rotationHome = numericFeature(analysis.features, "rotationPressureHome");
  const rotationAway = numericFeature(analysis.features, "rotationPressureAway");
  const knockoutContext = numericFeature(analysis.features, "knockoutContext");
  const marketConsensus = numericFeature(analysis.features, "marketConsensus");
  const steamMove = numericFeature(analysis.features, "steamMove");
  const reverseLineMovement = numericFeature(
    analysis.features,
    "reverseLineMovement",
  );
  const marketVolatility = numericFeature(analysis.features, "marketVolatility");
  const sharpSupport = numericFeature(analysis.features, "sharpSupport");

  const overview = [
    `${homeTeam} vs ${awayTeam}: Most Likely is ${most.label} (${formatPct(most.probability)}).`,
    `Prediction Confidence ${confidence.predictionConfidence} (${confidence.confidenceBand}) from ${confidence.policyVersion}.`,
    `Sealed recommendation remains ${analysis.projection.recommendation} (projection checksum ${analysis.projection.checksum}).`,
  ].join(" ");

  const keyFactorsBody =
    keyFactors.length > 0
      ? keyFactors.join(" ")
      : "No P1 channel Rules passed; lean stays cautious pending stronger Feature edges.";

  const strengthBody = [
    `AttackStrength: home attackRatingHome=${attackHome ?? "n/a"} vs away attackRatingAway=${attackAway ?? "n/a"}.`,
    `DefenseStability: home defenseRatingHome=${defenseHome ?? "n/a"} vs away defenseRatingAway=${defenseAway ?? "n/a"}.`,
    `RecentForm: recentFormHome=${formHome ?? "n/a"} vs recentFormAway=${formAway ?? "n/a"}.`,
    `FormDecomposition: homeAtHome=${formAtHomeHome ?? "n/a"} vs awayOnRoad=${formOnRoadAway ?? "n/a"}; goalsScoredRate home=${goalsScoredHome ?? "n/a"} away=${goalsScoredAway ?? "n/a"}.`,
    `AdvancedStatsFeatures (derived, not raw Evidence): attackEfficiency home=${attackEffHome ?? "n/a"} away=${attackEffAway ?? "n/a"}; possession home=${possessionHome ?? "n/a"} away=${possessionAway ?? "n/a"}; chanceCreation home=${chanceHome ?? "n/a"} away=${chanceAway ?? "n/a"}; disciplineRisk home=${disciplineHome ?? "n/a"} away=${disciplineAway ?? "n/a"}.`,
    `ExpectedGoalsFeatures (derived from EXPECTED_GOALS Evidence): xgAttackQuality home=${xgAttackHome ?? "n/a"} away=${xgAttackAway ?? "n/a"}; xgDefenseQuality home=${xgDefenseHome ?? "n/a"} away=${xgDefenseAway ?? "n/a"}; xgDominance=${xgDominance ?? "n/a"}; finishingEfficiency home=${finishingHome ?? "n/a"} away=${finishingAway ?? "n/a"}.`,
    `MatchContextFeatures (derived from MATCH_CONTEXT Evidence): fatigueIndex home=${fatigueHome ?? "n/a"} away=${fatigueAway ?? "n/a"}; scheduleAdvantage=${scheduleAdvantage ?? "n/a"}; homeStability=${homeStability ?? "n/a"}; rotationPressure home=${rotationHome ?? "n/a"} away=${rotationAway ?? "n/a"}; knockoutContext=${knockoutContext ?? "n/a"}.`,
    `MarketIntelligenceFeatures (derived from ODDS Evidence; supporting only): marketConsensus=${marketConsensus ?? "n/a"}; steamMove=${steamMove ?? "n/a"}; reverseLineMovement=${reverseLineMovement ?? "n/a"}; marketVolatility=${marketVolatility ?? "n/a"}; sharpSupport=${sharpSupport ?? "n/a"}.`,
  ].join(" ");

  const riskRules = analysis.ruleResults.filter(
    (rule) =>
      rule.status === "PASS" &&
      (rule.ruleName.startsWith("AVAILABILITY_") ||
        rule.ruleName.startsWith("VENUE_") ||
        rule.ruleName.includes("FRAGILE")),
  );
  const riskBody = [
    `Upset world: ${upset.label} at ${formatPct(upset.probability)} (Upset Risk ${confidence.upsetRisk}).`,
    `Second Likely: ${second.label} at ${formatPct(second.probability)}.`,
    riskRules.length > 0
      ? `Risk findings: ${riskRules.map((rule) => rule.ruleName).join(", ")}.`
      : "No availability/venue/fragile risk findings passed.",
  ].join(" ");

  const predictionBody = [
    `Winner lean: ${winnerLabel(most.winner, homeTeam, awayTeam)} via Most Likely scenario.`,
    `RuleAgreement ${confidence.ruleAgreement}; EvidenceCompleteness ${confidence.evidenceCompleteness}.`,
  ].join(" ");

  const scoreBody = `Recommended Score ${most.homeGoals}-${most.awayGoals} from Most Likely (${most.slot}, probability ${formatPct(most.probability)}).`;

  return Object.freeze({
    epistemicKind: "inference",
    providerId: LOCAL_DETERMINISTIC_NARRATIVE_PROVIDER_ID,
    promptManifestId: composition.manifest.manifestId,
    promptManifestChecksum: composition.manifest.checksum,
    sections: Object.freeze([
      Object.freeze({ title: "Overview", body: overview }),
      Object.freeze({ title: "Key Factors", body: keyFactorsBody }),
      Object.freeze({ title: "Strength Comparison", body: strengthBody }),
      Object.freeze({ title: "Risk Analysis", body: riskBody }),
      Object.freeze({ title: "Prediction", body: predictionBody }),
      Object.freeze({ title: "Recommended Score", body: scoreBody }),
    ]),
    disclaimer:
      "Inference draft only. Not fact, not market truth, not wagering advice. Built from sealed Features, Rules, Scenarios, and Confidence — no LLM.",
    generatedAt: analysis.generatedAt,
  });
}
