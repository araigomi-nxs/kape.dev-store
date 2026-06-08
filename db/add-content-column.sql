-- ============================================================
--  kape.dev — rich project/blog content
--  Run this in the Supabase SQL Editor (after schema.sql)
--  Adds a flexible JSONB column that stores the penny-style
--  detail-page content (badges, screenshots, features, etc.)
-- ============================================================

alter table public.projects
  add column if not exists content jsonb not null default '{}'::jsonb;

-- Shape stored in `content` (all keys optional):
-- {
--   "tagline":      "Track. Analyze. Grow.",
--   "rating":       "4.9",
--   "rating_label": "Business · Free",
--   "badges":   [ { "text": "Live", "kind": "live" } ],          -- kind: live | blue | amber
--   "actions":  [ { "label": "Download APK", "url": "https://…", "icon": "fab fa-android", "style": "blue" } ], -- style: blue | ghost
--   "screenshots": [ "https://…", "https://…" ],
--   "features": [ { "icon": "fas fa-chart-line", "name": "Profit Tracking", "desc": "…" } ],
--   "download": {
--       "qr_url":  "https://…",
--       "note":    "Available on Android. iOS coming soon.",
--       "buttons": [ { "small": "GET IT ON", "strong": "Google Play", "url": "https://…", "icon": "fab fa-google-play", "style": "blue" } ] -- style: blue | dark
--   }
-- }
