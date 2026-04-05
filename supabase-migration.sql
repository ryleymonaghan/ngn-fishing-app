-- ─────────────────────────────────────────────
-- NGN Fishing — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ─────────────────────────────────────────────

-- ── Profiles ─────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT NOT NULL,
  full_name            TEXT,
  boat_length_ft       INTEGER DEFAULT 24,
  boat_speed_mph       INTEGER DEFAULT 25,
  home_station         TEXT DEFAULT '8665530',
  reports_used         INTEGER DEFAULT 0,
  subscription_tier    TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'monthly', 'annual')),
  subscription_active  BOOLEAN DEFAULT false,
  subscription_expires TIMESTAMPTZ,
  stripe_customer_id   TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ── Reports ──────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id                  TEXT PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at        TIMESTAMPTZ NOT NULL,
  input               JSONB NOT NULL,
  conditions          JSONB,
  conditions_summary  TEXT,
  species             JSONB NOT NULL DEFAULT '[]',
  schedule            JSONB NOT NULL DEFAULT '[]',
  pro_tips            JSONB DEFAULT '[]',
  bait_finder_tip     TEXT,
  offshore_go_no_go   JSONB,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);

-- ── Saved Spots ──────────────────────────────
CREATE TABLE IF NOT EXISTS saved_spots (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  depth_ft    TEXT,
  notes       TEXT,
  access_type JSONB DEFAULT '[]',
  species     TEXT,
  saved_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_spots_user_id ON saved_spots(user_id);

-- ── Trip Logs ────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_logs (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id         TEXT REFERENCES reports(id) ON DELETE SET NULL,
  location          TEXT NOT NULL,
  species_caught    JSONB DEFAULT '[]',
  bait_used         JSONB DEFAULT '[]',
  rating            INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes             TEXT,
  share_coordinates BOOLEAN DEFAULT false,
  photo_count       INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_logs_user_id ON trip_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_logs_created_at ON trip_logs(created_at DESC);

-- ── Row Level Security ───────────────────────
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_logs   ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY "Users can view own profile"    ON profiles    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"  ON profiles    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"  ON profiles    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own reports"    ON reports     FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports"  ON reports     FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports"  ON reports     FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own spots"      ON saved_spots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own spots"    ON saved_spots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own spots"    ON saved_spots FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own trip logs"  ON trip_logs   FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trip logs" ON trip_logs  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Auto-create profile on signup ────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
