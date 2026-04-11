-- ─────────────────────────────────────────────
-- NGN Fishing — Community Feature (Pro Angler)
-- Run this in the Supabase SQL Editor AFTER the base migration
-- ─────────────────────────────────────────────

-- ── Enable PostGIS for radius queries ────────
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Update profiles subscription_tier CHECK ──
-- Add new tier values to match the app's 3-tier model
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'monthly', 'annual', 'pro_monthly', 'pro_annual', 'angler_monthly', 'angler_annual'));

-- ── Add display_name to profiles ─────────────
-- Used in community chat and pin drops
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ── Angler Chat ──────────────────────────────
-- Radius-based community chat for Pro Angler subscribers
CREATE TABLE IF NOT EXISTS angler_chat (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  message      TEXT NOT NULL CHECK (char_length(message) <= 500),
  location     GEOGRAPHY(Point, 4326) NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_angler_chat_location ON angler_chat USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_angler_chat_created_at ON angler_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_angler_chat_user_id ON angler_chat(user_id);

-- ── Live Pins ────────────────────────────────
-- Real-time bait/fishing location pins dropped by Pro Anglers
CREATE TABLE IF NOT EXISTS live_pins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  location     GEOGRAPHY(Point, 4326) NOT NULL,
  pin_type     TEXT NOT NULL CHECK (pin_type IN ('bait', 'fishing')),
  description  TEXT CHECK (char_length(description) <= 140),
  species_tag  TEXT,                    -- optional species reference
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL     -- auto-set to created_at + 4 hours
);

CREATE INDEX IF NOT EXISTS idx_live_pins_location ON live_pins USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_live_pins_expires_at ON live_pins(expires_at);
CREATE INDEX IF NOT EXISTS idx_live_pins_user_id ON live_pins(user_id);

-- ── Auto-set expires_at on insert ────────────
CREATE OR REPLACE FUNCTION set_pin_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '4 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_pin_expiry ON live_pins;
CREATE TRIGGER tr_set_pin_expiry
  BEFORE INSERT ON live_pins
  FOR EACH ROW EXECUTE FUNCTION set_pin_expiry();

-- ── Auto-populate geography from lat/lng ─────
CREATE OR REPLACE FUNCTION set_geography_from_latlng()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_chat_set_geo ON angler_chat;
CREATE TRIGGER tr_chat_set_geo
  BEFORE INSERT ON angler_chat
  FOR EACH ROW EXECUTE FUNCTION set_geography_from_latlng();

DROP TRIGGER IF EXISTS tr_pins_set_geo ON live_pins;
CREATE TRIGGER tr_pins_set_geo
  BEFORE INSERT ON live_pins
  FOR EACH ROW EXECUTE FUNCTION set_geography_from_latlng();

-- ── Purge expired pins (run via pg_cron or Edge Function) ──
CREATE OR REPLACE FUNCTION purge_expired_pins()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM live_pins WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Row Level Security ───────────────────────
ALTER TABLE angler_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_pins   ENABLE ROW LEVEL SECURITY;

-- Chat: Pro Anglers can read all messages within radius (handled app-side)
-- but can only insert their own messages
CREATE POLICY "Anglers can read chat"
  ON angler_chat FOR SELECT
  USING (true);  -- radius filtering done app-side via ST_DWithin query

CREATE POLICY "Anglers can insert own chat"
  ON angler_chat FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anglers can delete own chat"
  ON angler_chat FOR DELETE
  USING (auth.uid() = user_id);

-- Pins: same pattern — all Pro Anglers can see, only insert/delete own
CREATE POLICY "Anglers can read pins"
  ON live_pins FOR SELECT
  USING (true);

CREATE POLICY "Anglers can insert own pins"
  ON live_pins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anglers can delete own pins"
  ON live_pins FOR DELETE
  USING (auth.uid() = user_id);

-- ── Radius query helper (15 miles = 24140 meters) ──
-- Usage: SELECT * FROM nearby_chat(user_lat, user_lng, radius_meters, max_age_hours)
CREATE OR REPLACE FUNCTION nearby_chat(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 24140,  -- 15 miles
  p_max_age_hours INTEGER DEFAULT 24
)
RETURNS SETOF angler_chat AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM angler_chat
    WHERE ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
    AND created_at > now() - make_interval(hours := p_max_age_hours)
    ORDER BY created_at DESC
    LIMIT 200;
END;
$$ LANGUAGE plpgsql STABLE;

-- Usage: SELECT * FROM nearby_pins(user_lat, user_lng, radius_meters)
CREATE OR REPLACE FUNCTION nearby_pins(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 24140  -- 15 miles
)
RETURNS SETOF live_pins AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM live_pins
    WHERE ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
    AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Enable Realtime for community tables ─────
-- Run these in Supabase Dashboard > Database > Replication
-- or use the SQL below:
ALTER PUBLICATION supabase_realtime ADD TABLE angler_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE live_pins;
