-- Agent result cache — shared across all serverless instances
-- Replaces the in-memory Map in orchestrator.ts

CREATE TABLE IF NOT EXISTS agent_cache (
  id          text PRIMARY KEY,        -- "{symbol}_{timeframe}" e.g. "XAUUSD_H1"
  symbol      text NOT NULL,
  timeframe   text NOT NULL,
  result      jsonb NOT NULL,          -- full AgentRunResult JSON
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_cache_created_at_idx
  ON agent_cache (created_at DESC);

ALTER TABLE agent_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent cache is publicly readable"
  ON agent_cache FOR SELECT USING (true);

CREATE POLICY "Service role manages agent cache"
  ON agent_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
