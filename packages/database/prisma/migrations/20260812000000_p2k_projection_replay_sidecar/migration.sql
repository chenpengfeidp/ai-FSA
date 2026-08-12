-- P2K-B durable Projection Replay Sidecar
CREATE TABLE "projection_replay_sidecar_items" (
    "id" UUID NOT NULL,
    "history_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "content_sha256" CHAR(64) NOT NULL,
    "context_json" JSONB NOT NULL,
    "saved_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projection_replay_sidecar_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "projection_replay_sidecar_items_history_id_key" ON "projection_replay_sidecar_items"("history_id");

CREATE INDEX "projection_replay_sidecar_items_match_id_idx" ON "projection_replay_sidecar_items"("match_id");

ALTER TABLE "projection_replay_sidecar_items" ADD CONSTRAINT "projection_replay_sidecar_items_history_id_fkey" FOREIGN KEY ("history_id") REFERENCES "evaluation_history_items"("history_id") ON DELETE RESTRICT ON UPDATE CASCADE;
