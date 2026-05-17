-- Add open_time / close_time to manual_trades for Avg Hold Time calculation
ALTER TABLE manual_trades ADD COLUMN IF NOT EXISTS open_time  time;
ALTER TABLE manual_trades ADD COLUMN IF NOT EXISTS close_time time;
