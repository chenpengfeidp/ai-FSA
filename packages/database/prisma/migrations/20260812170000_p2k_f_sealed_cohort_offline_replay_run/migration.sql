-- P2K-F durable Sealed Cohort Offline Replay Run
CREATE TABLE "replay_run_items" (
    "id" UUID NOT NULL,
    "replay_run_id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "membership_digest_sha256" CHAR(64) NOT NULL,
    "match_script_calibration_label" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3) NOT NULL,
    "member_count" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "failure_count" INTEGER NOT NULL,
    "is_production_default" BOOLEAN NOT NULL,
    "production_promoted" BOOLEAN NOT NULL,
    "run_json" JSONB NOT NULL,

    CONSTRAINT "replay_run_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "replay_run_items_replay_run_id_key" ON "replay_run_items"("replay_run_id");

CREATE INDEX "replay_run_items_cohort_id_match_script_calibration_label_idx" ON "replay_run_items"("cohort_id", "match_script_calibration_label");

CREATE INDEX "replay_run_items_created_at_idx" ON "replay_run_items"("created_at" DESC);
