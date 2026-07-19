-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" CHAR(2),
    "competition_type" TEXT NOT NULL,
    "external_key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "country_code" CHAR(2),
    "external_key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "external_key" TEXT,
    "stage" TEXT,
    "kickoff_at" TIMESTAMPTZ(3) NOT NULL,
    "source_timezone" TEXT NOT NULL,
    "venue_name" TEXT,
    "status" TEXT NOT NULL,
    "data_cutoff_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("match_id","role")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "source_class" TEXT NOT NULL,
    "trust_metadata" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_records" (
    "id" UUID NOT NULL,
    "data_source_id" UUID NOT NULL,
    "match_id" UUID,
    "external_record_id" TEXT,
    "source_uri" TEXT,
    "observed_at" TIMESTAMPTZ(3) NOT NULL,
    "retrieved_at" TIMESTAMPTZ(3) NOT NULL,
    "payload_ref" TEXT,
    "payload_sha256" CHAR(64) NOT NULL,
    "parser_version" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "source_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_items" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "source_record_id" UUID NOT NULL,
    "evidence_type" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" UUID,
    "metric_key" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "unit" TEXT,
    "observed_at" TIMESTAMPTZ(3) NOT NULL,
    "valid_from" TIMESTAMPTZ(3),
    "valid_to" TIMESTAMPTZ(3),
    "quality_status" TEXT NOT NULL,
    "quality_score" DECIMAL(5,4),
    "normalizer_version" TEXT NOT NULL,
    "content_sha256" CHAR(64) NOT NULL,

    CONSTRAINT "evidence_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competitions_external_key_key" ON "competitions"("external_key");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_competition_id_name_key" ON "seasons"("competition_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_external_key_key" ON "teams"("external_key");

-- CreateIndex
CREATE UNIQUE INDEX "matches_external_key_key" ON "matches"("external_key");

-- CreateIndex
CREATE INDEX "matches_season_id_kickoff_at_idx" ON "matches"("season_id", "kickoff_at");

-- CreateIndex
CREATE INDEX "matches_status_kickoff_at_idx" ON "matches"("status", "kickoff_at");

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_match_id_team_id_key" ON "match_participants"("match_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_name_key" ON "data_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "source_records_data_source_id_external_record_id_payload_sh_key" ON "source_records"("data_source_id", "external_record_id", "payload_sha256");

-- CreateIndex
CREATE INDEX "evidence_items_match_id_evidence_type_metric_key_observed_a_idx" ON "evidence_items"("match_id", "evidence_type", "metric_key", "observed_at" DESC);

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
