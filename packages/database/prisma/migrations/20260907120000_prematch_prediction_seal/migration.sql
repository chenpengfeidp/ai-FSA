-- Authentic PRE_MATCH prediction seal (append-only Class A store)
CREATE TABLE "prematch_prediction_seal_items" (
    "id" UUID NOT NULL,
    "original_seal_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "home_team" TEXT NOT NULL,
    "away_team" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "kickoff_at" TIMESTAMPTZ(3) NOT NULL,
    "schema_version" TEXT NOT NULL,
    "sealed_at" TIMESTAMPTZ(3) NOT NULL,
    "content_sha256" CHAR(64) NOT NULL,
    "record_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prematch_prediction_seal_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prematch_prediction_seal_items_original_seal_id_key" ON "prematch_prediction_seal_items"("original_seal_id");

CREATE INDEX "prematch_prediction_seal_items_match_id_sealed_at_idx" ON "prematch_prediction_seal_items"("match_id", "sealed_at" DESC);
