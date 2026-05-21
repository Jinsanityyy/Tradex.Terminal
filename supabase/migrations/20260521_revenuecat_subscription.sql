-- Add RevenueCat subscription ID column for Google Play Billing tracking
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS revenuecat_subscription_id text;
