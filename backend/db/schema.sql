-- Run this in your Neon SQL editor or psql

CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  thumbnail_url TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('image', 'video')),
  guest_first_name TEXT NOT NULL,
  guest_last_name TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration NUMERIC
);

-- Index for ordering by created_at
CREATE INDEX IF NOT EXISTS photos_created_at_idx ON photos (created_at DESC);
