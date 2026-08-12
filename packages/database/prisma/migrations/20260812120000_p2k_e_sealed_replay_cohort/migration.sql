-- P2K-E durable Sealed Replay Cohort
CREATE TABLE "replay_cohort_items" (
    "id" UUID NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "specification_json" JSONB NOT NULL,
    "eligibility_contract_version" TEXT NOT NULL,
    "sidecar_schema_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "membership_created_at" TIMESTAMPTZ(3) NOT NULL,
    "sealed_at" TIMESTAMPTZ(3),
    "membership_digest_sha256" CHAR(64) NOT NULL,
    "limitations_json" JSONB NOT NULL,

    CONSTRAINT "replay_cohort_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "replay_cohort_items_cohort_id_key" ON "replay_cohort_items"("cohort_id");

CREATE INDEX "replay_cohort_items_status_created_at_idx" ON "replay_cohort_items"("status", "created_at" DESC);

CREATE TABLE "replay_cohort_member_items" (
    "id" UUID NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "history_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "replay_cohort_member_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "replay_cohort_member_items_cohort_id_history_id_key" ON "replay_cohort_member_items"("cohort_id", "history_id");

CREATE UNIQUE INDEX "replay_cohort_member_items_cohort_id_position_key" ON "replay_cohort_member_items"("cohort_id", "position");

CREATE INDEX "replay_cohort_member_items_history_id_idx" ON "replay_cohort_member_items"("history_id");

ALTER TABLE "replay_cohort_member_items" ADD CONSTRAINT "replay_cohort_member_items_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "replay_cohort_items"("cohort_id") ON DELETE RESTRICT ON UPDATE CASCADE;
