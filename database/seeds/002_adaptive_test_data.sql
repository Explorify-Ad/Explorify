-- =============================================================================
-- Explorify Adaptive Features Supplement  (seed 002)
-- Extends the 4 existing test users with data that exercises every
-- adaptive feature added in the latest sprint.
--
-- REQUIRES:
--   1. migration 007_add_ended_status.sql  ← run this FIRST (adds 'ended' to status constraint)
--   2. seed 001_test_data.sql
-- RUN: Supabase Dashboard → SQL Editor → paste & execute.
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING / DO UPDATE.
-- =============================================================================

DO $$
DECLARE
  -- Resolve the 4 existing users
  alice_id  UUID;
  marco_id  UUID;
  sophie_id UUID;
  dev_id    UUID;

  -- Landmark UUIDs (from seed 001)
  lm_howth          UUID := 'a0000001-0000-0000-0000-000000000012';
  lm_nat_gallery    UUID := 'a0000001-0000-0000-0000-000000000009';
  lm_glasnevin      UUID := 'a0000001-0000-0000-0000-000000000020';
  lm_st_michans     UUID := 'a0000001-0000-0000-0000-000000000017';
  lm_malahide       UUID := 'a0000001-0000-0000-0000-000000000018';
  lm_temple_bar     UUID := 'a0000001-0000-0000-0000-000000000005';
  lm_nat_museum     UUID := 'a0000001-0000-0000-0000-000000000010';
  lm_merrion_sq     UUID := 'a0000001-0000-0000-0000-000000000011';
  lm_trinity        UUID := 'a0000001-0000-0000-0000-000000000001';

  -- New expedition UUIDs (won't clash with seed 001's e0000001-...-001 and -002)
  exp_nightlife     UUID := 'e0000002-0000-0000-0000-000000000001';
  exp_arch_deep     UUID := 'e0000002-0000-0000-0000-000000000002';
  exp_stale         UUID := 'e0000002-0000-0000-0000-000000000003';
  exp_ended_past    UUID := 'e0000002-0000-0000-0000-000000000004';

BEGIN

  SELECT id INTO alice_id  FROM auth.users WHERE email = 'alice@explorify.test';
  SELECT id INTO marco_id  FROM auth.users WHERE email = 'marco@explorify.test';
  SELECT id INTO sophie_id FROM auth.users WHERE email = 'sophie@explorify.test';
  SELECT id INTO dev_id    FROM auth.users WHERE email = 'dev@explorify.test';

  IF alice_id IS NULL OR marco_id IS NULL OR sophie_id IS NULL OR dev_id IS NULL THEN
    RAISE EXCEPTION 'Existing test users not found. Run seed 001 first.';
  END IF;

  -- ===========================================================================
  -- 1. SUPPLEMENTAL CHECK-INS
  -- Goal: give Alice + Marco recent visits in NEW categories so the
  --       recency-weighted affinity engine (getCategoryAffinities) shows a
  --       visible drift away from their historical favourites.
  -- ===========================================================================

  -- ── Alice: add two fresh check-ins in Nature + Art ───────────────────────────
  -- Her old check-ins are Architecture/History (35–60 days ago).
  -- These new ones are 3–5 days old → their recency weight is ~10× higher.
  -- Result in NearbyScreen "For You": Nature and Art jump above Architecture.

  INSERT INTO collections
    (user_id, landmark_id, landmark_name, landmark_category,
     landmark_tier, xp_earned, dwell_time_min, visited_at)
  VALUES
    (alice_id, lm_howth,       'Howth Cliff Walk',            'Nature', 'discovered', 320, 88, NOW() - INTERVAL '5 days'),
    (alice_id, lm_nat_gallery, 'National Gallery of Ireland', 'Art',    'discovered', 320, 72, NOW() - INTERVAL '3 days')
  ON CONFLICT (user_id, landmark_id) DO NOTHING;

  -- ── Marco: add two fresh History check-ins ────────────────────────────────────
  -- Marco's history is Art/Food. As a Local the engine gives novelty bonuses
  -- for under-explored categories. These recent History visits will:
  --   a) Boost History in his affinity ranking
  --   b) Still trigger the local-novelty bonus in getRecommendations

  INSERT INTO collections
    (user_id, landmark_id, landmark_name, landmark_category,
     landmark_tier, xp_earned, dwell_time_min, visited_at)
  VALUES
    (marco_id, lm_glasnevin, 'Glasnevin Cemetery & Museum', 'History', 'hidden', 600, 65, NOW() - INTERVAL '4 days'),
    (marco_id, lm_st_michans,'St. Michan''s Church Vaults',  'History', 'hidden', 600, 48, NOW() - INTERVAL '2 days')
  ON CONFLICT (user_id, landmark_id) DO NOTHING;

  -- ── Sophie: one very first check-in (to test Level 1 → Level 2 transition) ───
  -- She starts at 0 XP (Level 1, public-only).  After this she has 150 XP
  -- (still Level 1) and you can watch the NearbyScreen unlock discovered
  -- landmarks the moment she crosses 500 XP.

  INSERT INTO collections
    (user_id, landmark_id, landmark_name, landmark_category,
     landmark_tier, xp_earned, dwell_time_min, visited_at)
  VALUES
    (sophie_id, lm_trinity, 'Trinity College Dublin', 'Architecture', 'public', 150, 40, NOW() - INTERVAL '1 day')
  ON CONFLICT (user_id, landmark_id) DO NOTHING;


  -- ===========================================================================
  -- 2. NEW EXPEDITIONS  (4 total, exercising different adaptive scenarios)
  -- ===========================================================================

  INSERT INTO expeditions
    (id, title, created_by, creator_name,
     landmark_id, landmark_name, landmark_lat, landmark_lon,
     categories, group_size, duration, dna_only, status, created_at)
  VALUES

    -- A) Nightlife & Food tour (Marco is creator)
    --    DNA match: Marco ~HIGH (food/art history matches), Alice ~LOW,
    --               Sophie ~LOW, Dev ~MEDIUM
    (exp_nightlife,
      'After Dark: Pubs & Hidden Gems',
      marco_id, 'Marco Walsh',
      lm_temple_bar, 'Temple Bar', 53.3452, -6.2644,
      ARRAY['nightlife','food'], 5, '2hr', false, 'active',
      NOW() - INTERVAL '45 minutes'),

    -- B) Architecture deep-dive (Dev is creator)
    --    DNA match: Alice ~HIGH (arch+history interests), Marco ~LOW,
    --               Sophie ~MEDIUM, Dev ~HIGH
    (exp_arch_deep,
      'Georgian Dublin: Doors & Details',
      dev_id, 'Dev Admin',
      lm_merrion_sq, 'Merrion Square', 53.3391, -6.2484,
      ARRAY['architecture','history'], 6, '2hr', false, 'active',
      NOW() - INTERVAL '20 minutes'),

    -- C) Stale expedition: active but created 26 hours ago
    --    autoExpireExpeditions() will flip this to 'ended' the next time
    --    fetchActiveExpeditions is called.  Good for live testing expiry.
    (exp_stale,
      'Night History Walk (should auto-expire)',
      alice_id, 'Alice Chen',
      lm_nat_museum, 'National Museum of Ireland', 53.3402, -6.2537,
      ARRAY['history'], 3, '1.5hr', false, 'active',
      NOW() - INTERVAL '26 hours'),

    -- D) Ended expedition: tests Past tab in MyExpeditions
    (exp_ended_past,
      'Art & Architecture Morning (ended)',
      dev_id, 'Dev Admin',
      lm_malahide, 'Malahide Castle & Gardens', 53.4500, -6.1545,
      ARRAY['art','architecture'], 4, '3hr', false, 'ended',
      NOW() - INTERVAL '3 days')

  ON CONFLICT (id) DO NOTHING;


  -- ===========================================================================
  -- 3. EXPEDITION MEMBERS
  -- ===========================================================================

  INSERT INTO expedition_members (expedition_id, user_id, user_name, joined_at)
  VALUES
    -- Nightlife tour: Marco (creator) + Dev joined
    (exp_nightlife,  marco_id, 'Marco Walsh', NOW() - INTERVAL '45 minutes'),
    (exp_nightlife,  dev_id,   'Dev Admin',   NOW() - INTERVAL '30 minutes'),

    -- Arch deep-dive: Dev (creator) + Alice + Sophie
    (exp_arch_deep,  dev_id,   'Dev Admin',   NOW() - INTERVAL '20 minutes'),
    (exp_arch_deep,  alice_id, 'Alice Chen',  NOW() - INTERVAL '15 minutes'),
    (exp_arch_deep,  sophie_id,'Sophie Kim',  NOW() - INTERVAL '10 minutes'),

    -- Stale expedition: Alice (creator) + Marco
    (exp_stale,      alice_id, 'Alice Chen',  NOW() - INTERVAL '26 hours'),
    (exp_stale,      marco_id, 'Marco Walsh', NOW() - INTERVAL '25 hours 40 minutes'),

    -- Ended past: Dev (creator) + Alice + Marco
    (exp_ended_past, dev_id,   'Dev Admin',   NOW() - INTERVAL '3 days'),
    (exp_ended_past, alice_id, 'Alice Chen',  NOW() - INTERVAL '3 days'),
    (exp_ended_past, marco_id, 'Marco Walsh', NOW() - INTERVAL '3 days')

  ON CONFLICT (expedition_id, user_id) DO NOTHING;


  -- ===========================================================================
  -- 4. MESSAGES for new expeditions
  -- ===========================================================================

  -- Nightlife tour
  INSERT INTO messages
    (expedition_id, sender_id, sender_name, content, type, metadata, created_at)
  VALUES
    (exp_nightlife, marco_id, 'Marco Walsh',
      'After Dark starting now! I''m outside Temple Bar Square — black jacket',
      'system', '{}', NOW() - INTERVAL '45 minutes'),
    (exp_nightlife, marco_id, 'Marco Walsh',
      'First stop is the unmarked bar on Crown Alley. Ring the brass bell.',
      'text', '{}', NOW() - INTERVAL '40 minutes'),
    (exp_nightlife, dev_id, 'Dev Admin',
      'On my way, 5 minutes',
      'text', '{}', NOW() - INTERVAL '32 minutes'),
    (exp_nightlife, marco_id, 'Marco Walsh',
      'Just checked in at Temple Bar',
      'check_in',
      '{"landmark":{"name":"Temple Bar","xp":150,"category":"Food","color":"#f97316"}}',
      NOW() - INTERVAL '25 minutes'),
    (exp_nightlife, dev_id, 'Dev Admin',
      'This place is unreal. Where next?',
      'text', '{}', NOW() - INTERVAL '10 minutes');

  -- Architecture deep-dive
  INSERT INTO messages
    (expedition_id, sender_id, sender_name, content, type, metadata, created_at)
  VALUES
    (exp_arch_deep, dev_id, 'Dev Admin',
      'Georgian Dublin walk is live! Starting at Merrion Square — meet by the Oscar Wilde statue',
      'system', '{}', NOW() - INTERVAL '20 minutes'),
    (exp_arch_deep, alice_id, 'Alice Chen',
      'I''m here! The fanlight details on these doors are incredible',
      'text', '{}', NOW() - INTERVAL '14 minutes'),
    (exp_arch_deep, sophie_id, 'Sophie Kim',
      'Just arrived, first expedition — so excited!',
      'text', '{}', NOW() - INTERVAL '9 minutes'),
    (exp_arch_deep, dev_id, 'Dev Admin',
      'Just checked in at Merrion Square',
      'check_in',
      '{"landmark":{"name":"Merrion Square","xp":320,"category":"Architecture","color":"#64748b"}}',
      NOW() - INTERVAL '5 minutes');

  -- Stale expedition (messages from 26h ago — will be auto-expired)
  INSERT INTO messages
    (expedition_id, sender_id, sender_name, content, type, metadata, created_at)
  VALUES
    (exp_stale, alice_id, 'Alice Chen',
      'Night History Walk beginning — meet at the museum main entrance',
      'system', '{}', NOW() - INTERVAL '26 hours'),
    (exp_stale, marco_id, 'Marco Walsh',
      'This will auto-expire soon — testing the 24h expiry feature',
      'text', '{}', NOW() - INTERVAL '25 hours 30 minutes');

  -- Ended expedition (historical messages)
  INSERT INTO messages
    (expedition_id, sender_id, sender_name, content, type, metadata, created_at)
  VALUES
    (exp_ended_past, dev_id, 'Dev Admin',
      'Art & Architecture tour wrapped up. Malahide Castle was worth the trip!',
      'text', '{}', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
    (exp_ended_past, alice_id, 'Alice Chen',
      'Best expedition yet. Count me in for the next one.',
      'text', '{}', NOW() - INTERVAL '3 days' + INTERVAL '2 hours 20 minutes'),
    (exp_ended_past, marco_id, 'Marco Walsh',
      'Agreed. Hidden tier landmarks hit different when you get there as a group.',
      'text', '{}', NOW() - INTERVAL '3 days' + INTERVAL '2 hours 40 minutes');

END $$;
