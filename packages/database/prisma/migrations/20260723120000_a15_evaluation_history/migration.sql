-- A1.5 Evaluation History (append-only platform store)
CREATE TABLE "evaluation_history_items" (
    "id" UUID NOT NULL,
    "history_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "competition_id" TEXT,
    "competition_name" TEXT,
    "season" TEXT NOT NULL,
    "match_date" TIMESTAMPTZ(3) NOT NULL,
    "home_team" TEXT NOT NULL,
    "away_team" TEXT NOT NULL,
    "feature_model_version" TEXT NOT NULL,
    "rule_set_version" TEXT NOT NULL,
    "projection_model_version" TEXT NOT NULL,
    "evaluation_model_version" TEXT NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL,
    "content_sha256" CHAR(64) NOT NULL,
    "record_json" JSONB NOT NULL,

    CONSTRAINT "evaluation_history_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evaluation_history_items_history_id_key" ON "evaluation_history_items"("history_id");

CREATE INDEX "evaluation_history_items_match_id_recorded_at_idx" ON "evaluation_history_items"("match_id", "recorded_at" DESC);

CREATE INDEX "evaluation_history_items_competition_id_season_match_date_idx" ON "evaluation_history_items"("competition_id", "season", "match_date");

CREATE INDEX "evaluation_history_items_season_match_date_idx" ON "evaluation_history_items"("season", "match_date");

CREATE INDEX "evaluation_history_items_match_date_idx" ON "evaluation_history_items"("match_date");
