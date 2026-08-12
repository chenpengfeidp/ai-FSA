import { createRuleResult, RuleResultValidationError } from "@fas/rule";
import { createMatchId } from "@fas/match";
import type { SealedProjectionReplayContext } from "@fas/statistics";

/**
 * Validation / diagnostic only (P2K-G recovery).
 * Detects whether a sealed Sidecar's rules can be rebuilt by P2K-D offline replay
 * via createRuleResult — without mutating History/Sidecar and without changing P2K-C.
 */
export type SealedReplayRuleRebuildIssueCode =
  | "INVALID_RULE_ID"
  | "INVALID_RULE_NAME"
  | "INVALID_SCORE"
  | "INVALID_STATUS"
  | "INVALID_CHANNEL"
  | "INVALID_EVALUATED_AT"
  | "OTHER_RULE_RESULT_VALIDATION";

export interface SealedReplayRuleRebuildIssue {
  readonly code: SealedReplayRuleRebuildIssueCode;
  readonly ruleId: string;
  readonly ruleName: string;
  readonly message: string;
}

export interface SealedReplayRuleRebuildAssessment {
  readonly rebuildable: boolean;
  readonly ruleCount: number;
  readonly issues: readonly SealedReplayRuleRebuildIssue[];
}

function classifyMessage(message: string): SealedReplayRuleRebuildIssueCode {
  if (message.startsWith("ruleId ")) {
    return "INVALID_RULE_ID";
  }
  if (message.startsWith("ruleName ")) {
    return "INVALID_RULE_NAME";
  }
  if (message.startsWith("score ")) {
    return "INVALID_SCORE";
  }
  if (message.startsWith("status ")) {
    return "INVALID_STATUS";
  }
  if (message.startsWith("channel ")) {
    return "INVALID_CHANNEL";
  }
  if (message.startsWith("evaluatedAt ")) {
    return "INVALID_EVALUATED_AT";
  }
  return "OTHER_RULE_RESULT_VALIDATION";
}

/**
 * Attempts the same createRuleResult rebuild used by
 * buildRuleResultsFromSealedReplayContext. Failures are collected; never repaired.
 */
export function assessSealedReplayRuleRebuild(
  context: SealedProjectionReplayContext,
): SealedReplayRuleRebuildAssessment {
  const issues: SealedReplayRuleRebuildIssue[] = [];
  const matchId = createMatchId(context.matchId);

  for (const rule of context.rules) {
    try {
      createRuleResult({
        ruleId: rule.ruleId,
        matchId,
        ruleName: rule.ruleName,
        status: rule.status,
        score: rule.score,
        weight: rule.weight,
        channel: rule.channel,
        explanation: `Replay rule ${rule.ruleName}.`,
        sourceFeatureIds: Object.freeze([]),
        evaluatedAt: context.generatedAt,
      });
    } catch (error) {
      const message =
        error instanceof RuleResultValidationError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      issues.push(
        Object.freeze({
          code: classifyMessage(message),
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          message,
        }),
      );
    }
  }

  return Object.freeze({
    rebuildable: issues.length === 0 && context.rules.length > 0,
    ruleCount: context.rules.length,
    issues: Object.freeze(issues),
  });
}
