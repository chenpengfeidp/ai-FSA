# Vertical Slice A.1 — Population Frequency-Ratio Calibration

## Goal

Replace match-run identity-only calibration with a Statistics-owned **computed_candidate** artifact fitted offline from a declared immutable 1X2 population, while Analysis still only consumes an exact pinned reference (no training during a match run).

## Inclusions

- Population row contract: `{ pHome, pDraw, pAway, outcome }` with `outcome ∈ {home,draw,away}`;
- Pure fit: `frequency_ratio_1x2` multipliers = observed outcome rates / mean predicted rates (clamped);
- Recorded population module (`population-1x2-demo-v1.ts`) + pinned artifact `calibration:population-demo:v1` (`status=computed_candidate`, `qualified=false`);
- `applyCalibration` supports identity + frequency_ratio maps;
- Config `CALIBRATION_ARTIFACT=identity|population_demo_v1` (default `population_demo_v1`);
- Analysis / API wire the pinned artifact into `computeDeterministicMatchProjection`;
- Projection limitations state the artifact is not Evaluation-qualified.

## Exclusions

- Evaluation-qualified release gates;
- Online / per-match retraining;
- Isotonic / temperature / neural calibrators;
- Durable PostgreSQL population store;
- Live scraping of historical sealed projections;
- Chinese UI (parallel track).

## Acceptance

- Rebuilding the artifact from the fixture is deterministic (stable checksum);
- With `population_demo_v1`, analyze reports `calibrationArtifactId=calibration:population-demo:v1` and `calibrationQualified=false`;
- Identity mode remains available and leaves probabilities unchanged (aside from renormalization);
- `@fas/statistics`, `@fas/analysis`, `@fas/config`, `@fas/api` tests covering the path pass.
