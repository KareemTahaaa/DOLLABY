-- Run this in your Supabase SQL Editor (once)
-- Creates the catalog_items table and sets up Row Level Security

CREATE TABLE IF NOT EXISTS catalog_items (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT        NOT NULL,
    category    TEXT        NOT NULL CHECK (category IN ('Top','Bottom','Dress','Outerwear','Shoes','Accessories')),
    color       TEXT        NOT NULL,
    season      TEXT        DEFAULT 'All' CHECK (season IN ('Summer','Winter','Spring','Fall','All')),
    gender      TEXT        DEFAULT 'Unisex' CHECK (gender IN ('Men','Women','Unisex')),
    occasion    TEXT        DEFAULT 'Casual',
    brand       TEXT,
    fabric      TEXT,
    description TEXT,
    tags        TEXT[]      DEFAULT '{}',
    image_url   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Read-only for everyone (no auth needed to browse the catalog)
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public catalog read"  ON catalog_items;
CREATE POLICY "Public catalog read"  ON catalog_items FOR SELECT USING (true);

-- Only the service role (backend) can write
DROP POLICY IF EXISTS "Service role write"  ON catalog_items;
CREATE POLICY "Service role write"  ON catalog_items
    FOR ALL USING (auth.role() = 'service_role');

-- Speed up common filter queries
CREATE INDEX IF NOT EXISTS catalog_category_idx ON catalog_items (category);
CREATE INDEX IF NOT EXISTS catalog_gender_idx   ON catalog_items (gender);
CREATE INDEX IF NOT EXISTS catalog_season_idx   ON catalog_items (season);
