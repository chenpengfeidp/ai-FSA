# I2B — Market Intelligence Completion Report

| Field | Value |
|---|---|
| Sprint | **I2B** Market Intelligence |
| Date | 2026-07-23 |
| Authority | Architecture Freeze v0.2 · B2 Coding Law · D0 Expansion Roadmap |
| Scope | Deterministic Feature → Rule → Confidence → Projection consume of ODDS Market Evidence |
| Explicit exclusions | AI Features · inventing public/sharp/movement · DB schema · Engines · architecture redesign · Projection λ rewrite · Market into football softmax |

---

## 1. Completion Report

I2B consumes I2A `ODDS` Market Evidence and derives deterministic Market Intelligence Features. Those Features feed findings-only Rules (`channel: none`); Confidence gains a capped alignment bonus when Market lean agrees with Football Intelligence and applies a disagreement penalty when they conflict. Projection records Market Intelligence as supporting limitations only and never lets Market override Football 1X2. Missing depth Evidence yields omitted Features → `INAPPLICABLE` Rules — never estimated steam, RLM, public %, or sharp indicators.

Pins bumped:

- `feature.v2.i2b.market`
- `rule.mvp.i2b.market`
- `projection.v2.i2b.market`

---

## 2. Files changed

### Feature (`@fas/feature`)

- `src/extraction/feature-math.ts` — consensus / steam / RLM / volatility / sharp math
- `src/extraction/feature-extractor.ts` — `extractMarketIntelligenceFeatures`
- `src/domain/feature.ts` / `feature-bundle.ts` / `index.ts`
- `test/feature-extractor.spec.ts`

### Rule (`@fas/rule`)

- `src/evaluation/rule-evaluator.ts` — Market Intelligence Rules
- `src/domain/rule-result.ts` — RuleId / RuleName registry
- `test/rule-evaluator.spec.ts`

### Analysis / Report / Web / Docs

- `packages/analysis/src/confidence/intelligence-confidence.ts`
- `packages/analysis/src/projection/compute-deterministic-projection.ts`
- `packages/analysis/src/projection/deterministic-match-projection.ts`
- `packages/report/src/narrative/mvp/build-mvp-narrative.ts`
- `apps/web` types, labels, copy; fixture projection pin
- `apps/api` swagger example + workflow pin
- `docs/50_EVIDENCE_CATALOG.md`, `docs/PROJECT_STATE.md`, this report

---

## 3. New Market Intelligence Features

| Feature | Source | Notes |
|---|---|---|
| `marketConsensus` | ≥2 of marketLean / asianHandicapLean | Signed mean when same sign; opposing → 0; omitted if <2 leans |
| `steamMove` | handicap / odds movement | Positive → home; omitted without movement |
| `reverseLineMovement` | public % + line/odds movement | Only when public distribution exists; 0 when no RLM pattern |
| `marketVolatility` | magnitude of available movements | [0,100]; not tick frequency (honest) |
| `sharpSupport` | sharpMoneyIndicator + lean direction | Omitted without provider sharp indicator |

---

## 4. Rule integrations

| Rule | Channel | Required Feature | PASS |
|---|---|---|---|
| `MARKET_CONSENSUS` | none | marketConsensus | \|value\| ≥ τ |
| `STEAM_MOVE` | none | steamMove | \|value\| ≥ τ |
| `REVERSE_LINE_MOVEMENT` | none | reverseLineMovement | \|value\| ≥ τ |
| `MARKET_VOLATILITY` | none | marketVolatility | value ≥ τ |
| `SHARP_SUPPORT` | none | sharpSupport | \|value\| ≥ τ |

Missing Features → `INAPPLICABLE`. Existing `MARKET_LEAN_*` / `MARKET_AH_LEAN_*` unchanged. No Market Rule enters football softmax.

---

## 5. Confidence impact

- Alignment bonus (capped +6) when Market lean agrees with dominant Football P1 channel; extra when Market Intelligence findings also PASS
- Disagreement penalty (capped −8) when Market lean conflicts with Football; Market does not override Football
- Limitation text for absent ODDS / bonus / penalty
- Policy version unchanged (`confidence.mvp.a05`) — no Confidence redesign

---

## 6. Projection impact

- Market Intelligence PASS findings recorded as supporting limitations only
- Existing MARKET_LEAN conflict → cautious gate unchanged
- Projection model pin: `projection.v2.i2b.market`
- No Projection architecture rewrite; Market never blends into 1X2

---

## 7. Workspace / Report impact

- Feature Importance labels mark derived Market Features “(derived)”
- Market Evidence section remains raw Evidence; copy distinguishes Evidence vs Features
- Narrative Strength cites MarketIntelligenceFeatures; Key Factors still cite Rule outputs only

---

## 8. Tests added / updated

- Feature extractor: Market Intelligence extract + honest absence + RLM opposite-move case
- Rule evaluator: Market Intelligence PASS + INAPPLICABLE when Features absent
- Projection / fixture pins updated in API/web tests

---

## 9. Quality Gates

```bash
pnpm validate
```

**Result (2026-07-23):** passed (`pnpm validate` — toolchain, workspace, prisma, biome, boundaries, typecheck, test, build).

---

## 10. Remaining limitations

- Live Odds API often lacks opening/closing/public/sharp → steam/RLM/sharp Features frequently INAPPLICABLE
- Market volatility is magnitude-based from open→current samples, not tick frequency
- Market Consensus currently uses 1X2 + AH leans (same bookmaker path), not multi-bookmaker fan-out
- Market Rules remain findings-only; they never override Football Intelligence

---

## 11. Recommended next sprint

**Architecture Freeze Review (v0.3)**, followed by **A1 Prediction Evaluation** (frozen-population evaluation of sealed projections).

---

*End of I2B Completion Report.*
