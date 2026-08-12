-- P2K-G durable Sealed Cohort Population Evaluation
CREATE TABLE "population_evaluation_items" (
    "id" UUID NOT NULL,
    "evaluation_run_id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "membership_digest_sha256" CHAR(64) NOT NULL,
    "baseline_replay_run_id" TEXT NOT NULL,
    "candidate_replay_run_id" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "evaluation_json" JSONB NOT NULL,

    CONSTRAINT "population_evaluation_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "population_evaluation_items_evaluation_run_id_key" ON "population_evaluation_items"("evaluation_run_id");

CREATE INDEX "population_evaluation_items_cohort_id_created_at_idx" ON "population_evaluation_items"("cohort_id", "created_at" DESC);
