# I2A — Odds & Market Evidence Completion Report

| Field | Value |
|---|---|
| Sprint | **I2A** Odds & Market Evidence |
| Date | 2026-07-23 |
| Authority | Architecture Freeze v0.2 · B2 Coding Law · D0 Expansion Roadmap |
| Scope | Production Evidence path only (Provider → Normalizer → Evidence → Workspace → Report) |
| Explicit exclusions | Market Features · Rules · Projection · Confidence · DB schema · Engines · architecture redesign |

---

## 1. Completion Report

I2A extends first-class `ODDS` Evidence so Odds & Market information is supporting evidence only.

- Metrics are mapped only when the provider supplies them.
- Unavailable metrics remain honest absence (never estimated, inferred, or fabricated).
- Live The Odds API payloads map current 1X2 / spreads / totals when present; opening/closing/public/volume/sharp stay absent unless a recorded cassette supplies `fas_market_depth`.
- Workspace/Report expose raw Market Evidence separately from derived Football Intelligence.
- No Market Features, Rules, Projection, or Confidence changes in this sprint.

---

## 2. Files changed

### Provider (`@fas/provider-odds`)

- `src/domain/market-evidence.ts` (new) — canonical market record types
- `src/domain/pre-match-odds.ts` — overlay depth fields + `markets[]`
- `src/mapper/map-the-odds-api-h2h.ts` — h2h + spreads + totals + optional recorded depth
- `src/composite/composite-match-provider.ts` — serialize full overlay into match `odds`
- `src/index.ts` — export market types
- `fixtures/match-example.json` — totals + `fas_market_depth` demo
- `test/map-the-odds-api-h2h.spec.ts`

### Evidence / Normalizer

- `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts` — optional O/U, opening/closing, movement, public/volume/sharp, `markets[]`
- `packages/evidence-normalizer/test/market-odds-evidence.spec.ts` (new)

### Web / Docs

- `apps/web/src/types/explainable-report.ts`
- `apps/web/src/lib/explainable-report.ts`
- `apps/web/src/components/explainable-report/market-evidence.tsx` (new)
- `apps/web/src/components/explainable-report/explainable-match-report.tsx`
- `apps/web/src/copy/zh.ts`
- `docs/50_EVIDENCE_CATALOG.md`
- `docs/PROJECT_STATE.md`
- `docs/sprints/I2/I2A_ODDS_MARKET_EVIDENCE_COMPLETION_REPORT.md` (this file)

---

## 3. Provider coverage

| Source | Coverage |
|---|---|
| Live The Odds API event odds | Current European 1X2 (`h2h`), Asian Handicap (`spreads`), Over/Under (`totals`) when bookmaker markets present; market timestamp + bookmaker `marketSource` |
| Live without depth history | Opening / closing / movement / public % / volume / sharp → honest absence |
| Recorded cassette `match-example` | Full demo: 1X2 + AH + O/U + opening/closing + movements + public/volume/sharp + `markets[]` via `fas_market_depth` |
| Recorded cassette `match-example-1` | 1X2 + AH current only; no invented depth or O/U |

Never invents movement without both opening and current. Never fabricates public betting, volume, or sharp indicators.

---

## 4. New Market Evidence mapped

Evidence type remains: `ODDS` (extended payload; no new Evidence type / DB schema).

Each Market record / summary preserves when supplied:

- Provider provenance (`source`, `sourceId`, `method`, collector)
- Market timestamp (`observedAt`)
- Market type / selection (`markets[]`: european_1x2, asian_handicap, over_under)
- Opening / current / closing values
- Movement (odds, handicap line, O/U line) only when both sides are provider-supplied
- Market source metadata (bookmaker key)
- Optional public betting %, betting volume, sharp money indicator

Flat payload mirrors summary fields for existing 1X2/AH consumers.

---

## 5. Workspace impact

- New Workspace section: **Odds & Market Evidence**
- Clearly separate from Feature Importance (derived Football Intelligence)
- Copy states Evidence-only / supporting posture: no Market Features in I2A

---

## 6. Report impact

- Report displays provider Market Evidence values and provenance
- Evidence timeline labels ODDS as **Odds & Market**
- No interpretation, scoring, or prediction from Market Evidence in this sprint

---

## 7. Tests added

- `packages/provider-odds/test/map-the-odds-api-h2h.spec.ts` — totals + depth + honest absence
- `packages/evidence-normalizer/test/market-odds-evidence.spec.ts` — normalize / reject partial O/U / invalid markets

---

## 8. Quality Gates

```bash
pnpm validate
```

**Result (2026-07-23):** passed (`pnpm validate` — toolchain, workspace, prisma, biome, boundaries, typecheck, test, build).

---

## 9. Remaining limitations

- Live The Odds API single snapshot does not provide historical opening/closing; those remain recorded-demo-only via `fas_market_depth`
- Public betting %, volume, and sharp indicators are not available from The Odds API live payload
- Existing B.1/B.2 market lean Features remain unchanged; I2A does not add Steam / RLM / Consensus / Sharp Support Features
- No Rule, Confidence, or Projection integration for new market depth fields

---

## 10. Recommended next sprint

**I2B** — Transform Market Evidence into deterministic Market Intelligence Features (Steam Move, Reverse Line Movement, Market Consensus, Sharp Support) with honest absence when depth Evidence is missing.

---

*End of I2A Completion Report.*
