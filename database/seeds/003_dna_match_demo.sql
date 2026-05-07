-- =============================================================================
-- Seed: DNA Match Demo Expeditions
-- 3 expeditions designed to demonstrate Exploration DNA matching:
--   🟢 High match  (~92%) — history/architecture lover, dna_only=true
--   🟡 Medium match (~61%) — mixed categories, open to all
--   🔴 Low match   (~28%) — nightlife/food focus, opposite of a heritage profile
--
-- HOW TO RUN:
--   Paste into Supabase Dashboard → SQL Editor and execute.
--   Requires: test users from 001_test_data.sql already exist.
-- =============================================================================

DO $$
DECLARE
  alice_id   UUID;
  marco_id   UUID;
  sophie_id  UUID;
  dev_id     UUID;

  -- Fixed UUIDs so this script is idempotent
  exp_heritage_trail  UUID := 'e0000002-0000-0000-0000-000000000001';
  exp_mixed_city      UUID := 'e0000002-0000-0000-0000-000000000002';
  exp_night_bites     UUID := 'e0000002-0000-0000-0000-000000000003';

  -- Landmark refs from 001_test_data
  lm_trinity       UUID := 'a0000001-0000-0000-0000-000000000001';
  lm_dublin_castle UUID := 'a0000001-0000-0000-0000-000000000008';
  lm_nat_museum    UUID := 'a0000001-0000-0000-0000-000000000010';
  lm_phoenix_park  UUID := 'a0000001-0000-0000-0000-000000000003';
  lm_temple_bar    UUID := 'a0000001-0000-0000-0000-000000000005';

BEGIN

  -- ── Resolve auth user UUIDs ──────────────────────────────────────────────
  SELECT id INTO alice_id  FROM auth.users WHERE email = 'alice@explorify.test';
  IF alice_id  IS NULL THEN alice_id  := 'f0000000-0000-0000-0000-000000000001'; END IF;

  SELECT id INTO marco_id  FROM auth.users WHERE email = 'marco@explorify.test';
  IF marco_id  IS NULL THEN marco_id  := 'f0000000-0000-0000-0000-000000000002'; END IF;

  SELECT id INTO sophie_id FROM auth.users WHERE email = 'sophie@explorify.test';
  IF sophie_id IS NULL THEN sophie_id := 'f0000000-0000-0000-0000-000000000003'; END IF;

  SELECT id INTO dev_id    FROM auth.users WHERE email = 'dev@explorify.test';
  IF dev_id    IS NULL THEN dev_id    := 'f0000000-0000-0000-0000-000000000004'; END IF;

  -- =========================================================================
  -- EXPEDITION 1: 🟢 HIGH DNA MATCH (~92%)
  -- History + Architecture, DNA-only, small group, morning paced
  -- Perfect for a tourist whose DNA is architecture/history
  -- =========================================================================
  INSERT INTO expeditions (
    id, title, description, created_by, creator_name,
    landmark_id, landmark_name, landmark_lat, landmark_lon,
    categories, group_size, duration, dna_only, status,
    is_narrative, created_at, updated_at
  ) VALUES (
    exp_heritage_trail,
    'Dublin Heritage Deep Dive',
    'A curated walk through Dublin''s most storied landmarks — from Viking foundations at Dublin Castle to the Book of Kells at Trinity. DNA-matched guests only.',
    alice_id, 'Alice Chen',
    lm_trinity, 'Trinity College Dublin', 53.3440, -6.2545,
    ARRAY['history', 'architecture'], 4, '2hr', true, 'active',
    false, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'
  ) ON CONFLICT (id) DO NOTHING;

  -- Members: Alice (creator) + Sophie
  INSERT INTO expedition_members (expedition_id, user_id, user_name, joined_at) VALUES
    (exp_heritage_trail, alice_id,  'Alice Chen',  NOW() - INTERVAL '45 minutes'),
    (exp_heritage_trail, sophie_id, 'Sophie Kim',  NOW() - INTERVAL '30 minutes')
  ON CONFLICT (expedition_id, user_id) DO NOTHING;

  -- Chat messages
  INSERT INTO messages (expedition_id, sender_id, sender_name, content, type, metadata, created_at) VALUES
    (exp_heritage_trail, alice_id, 'Alice Chen',
      'Expedition started! Meet at the main gate of Trinity — look for the cobblestone arch. 🏛️',
      'system', '{}', NOW() - INTERVAL '45 minutes'),
    (exp_heritage_trail, alice_id, 'Alice Chen',
      'The Book of Kells queue is short right now — let''s start inside before heading to the castle.',
      'text', '{}', NOW() - INTERVAL '40 minutes'),
    (exp_heritage_trail, sophie_id, 'Sophie Kim',
      'On my way! 5 mins out',
      'text', '{}', NOW() - INTERVAL '32 minutes'),
    (exp_heritage_trail, sophie_id, 'Sophie Kim',
      'Just checked in at Trinity College Dublin',
      'check_in',
      '{"landmark":{"name":"Trinity College Dublin","xp":400,"category":"Historical","color":"#d97706"}}',
      NOW() - INTERVAL '28 minutes'),
    (exp_heritage_trail, alice_id, 'Alice Chen',
      'Vote: Which way after Trinity?',
      'vote',
      '{"options":[{"label":"Dublin Castle","votes":1},{"label":"National Museum","votes":0}],"totalVotes":1}',
      NOW() - INTERVAL '15 minutes')
  ON CONFLICT DO NOTHING;


  -- =========================================================================
  -- EXPEDITION 2: 🟡 MEDIUM DNA MATCH (~61%)
  -- Mixed categories (nature + art + food), open to everyone, larger group
  -- Partially overlaps with many DNA profiles
  -- =========================================================================
  INSERT INTO expeditions (
    id, title, description, created_by, creator_name,
    landmark_id, landmark_name, landmark_lat, landmark_lon,
    categories, group_size, duration, dna_only, status,
    is_narrative, created_at, updated_at
  ) VALUES (
    exp_mixed_city,
    'Sunday City Wander',
    'A relaxed mix of parks, street art and coffee stops. No strict DNA filter — all explorers welcome. Good for discovering unexpected corners of Dublin.',
    dev_id, 'Dev Admin',
    lm_phoenix_park, 'Phoenix Park', 53.3561, -6.3294,
    ARRAY['nature', 'art', 'food'], 8, 'Half Day', false, 'active',
    false, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'
  ) ON CONFLICT (id) DO NOTHING;

  -- Members: Dev (creator) + Marco + Sophie
  INSERT INTO expedition_members (expedition_id, user_id, user_name, joined_at) VALUES
    (exp_mixed_city, dev_id,    'Dev Admin',   NOW() - INTERVAL '2 hours'),
    (exp_mixed_city, marco_id,  'Marco Walsh', NOW() - INTERVAL '1 hour 50 minutes'),
    (exp_mixed_city, sophie_id, 'Sophie Kim',  NOW() - INTERVAL '1 hour 40 minutes')
  ON CONFLICT (expedition_id, user_id) DO NOTHING;

  -- Chat messages
  INSERT INTO messages (expedition_id, sender_id, sender_name, content, type, metadata, created_at) VALUES
    (exp_mixed_city, dev_id, 'Dev Admin',
      'Sunday Wander is live! Starting at Phoenix Park — enter via the Castleknock Gate. ☀️',
      'system', '{}', NOW() - INTERVAL '2 hours'),
    (exp_mixed_city, marco_id, 'Marco Walsh',
      'Spotted the deer herd near the Magazine Fort — incredible 🦌',
      'text', '{}', NOW() - INTERVAL '1 hour 45 minutes'),
    (exp_mixed_city, sophie_id, 'Sophie Kim',
      'Just checked in at Phoenix Park',
      'check_in',
      '{"landmark":{"name":"Phoenix Park","xp":200,"category":"Nature","color":"#16a34a"}}',
      NOW() - INTERVAL '1 hour 38 minutes'),
    (exp_mixed_city, dev_id, 'Dev Admin',
      'Moving on to the street art wall on Thomas St next. Anyone know a good coffee spot nearby?',
      'text', '{}', NOW() - INTERVAL '1 hour'),
    (exp_mixed_city, marco_id, 'Marco Walsh',
      'Brother Hubbard on Capel St is 10 mins away — highly recommend',
      'text', '{}', NOW() - INTERVAL '58 minutes')
  ON CONFLICT DO NOTHING;


  -- =========================================================================
  -- EXPEDITION 3: 🔴 LOW DNA MATCH (~28%)
  -- Nightlife + food only, evening timing, dna_only=true
  -- Will score low for a heritage/architecture-focused user DNA
  -- =========================================================================
  INSERT INTO expeditions (
    id, title, description, created_by, creator_name,
    landmark_id, landmark_name, landmark_lat, landmark_lon,
    categories, group_size, duration, dna_only, status,
    is_narrative, created_at, updated_at
  ) VALUES (
    exp_night_bites,
    'Temple Bar After Dark',
    'A night out for the foodies and night owls. Bar hops, street food and live music in Dublin''s cultural quarter. DNA-matched to nightlife and food explorers.',
    marco_id, 'Marco Walsh',
    lm_temple_bar, 'Temple Bar', 53.3454, -6.2642,
    ARRAY['food', 'nightlife'], 6, '2hr', true, 'active',
    false, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes'
  ) ON CONFLICT (id) DO NOTHING;

  -- Members: Marco (creator) only — just launched
  INSERT INTO expedition_members (expedition_id, user_id, user_name, joined_at) VALUES
    (exp_night_bites, marco_id, 'Marco Walsh', NOW() - INTERVAL '20 minutes')
  ON CONFLICT (expedition_id, user_id) DO NOTHING;

  -- Chat messages
  INSERT INTO messages (expedition_id, sender_id, sender_name, content, type, metadata, created_at) VALUES
    (exp_night_bites, marco_id, 'Marco Walsh',
      'Temple Bar After Dark is go! Starting at the square — I''m by the Central Hotel side. 🍺',
      'system', '{}', NOW() - INTERVAL '20 minutes'),
    (exp_night_bites, marco_id, 'Marco Walsh',
      'First stop: the taco truck on Curved Street. Trust me on this one.',
      'text', '{}', NOW() - INTERVAL '18 minutes')
  ON CONFLICT DO NOTHING;

END $$;
