-- =============================================================================
-- Explorify Test Data Seed — Dublin, Ireland
-- =============================================================================
-- STEP 1: Run migration 006_adaptive_features.sql first (adds tier, visitor_type, etc.)
-- STEP 2: Create 4 auth users in Supabase Dashboard → Authentication → Add User:
--           alice@explorify.test   / TestPass123!
--           marco@explorify.test   / TestPass123!
--           sophie@explorify.test  / TestPass123!
--           dev@explorify.test     / TestPass123!
-- STEP 3: Run THIS file in Supabase Dashboard → SQL Editor.
-- =============================================================================

DO $$
DECLARE
  alice_id   UUID;
  marco_id   UUID;
  sophie_id  UUID;
  dev_id     UUID;

  -- Landmark UUIDs (fixed so messages/expeditions can reference them)
  lm_trinity        UUID := 'a0000001-0000-0000-0000-000000000001';
  lm_st_patrick     UUID := 'a0000001-0000-0000-0000-000000000002';
  lm_phoenix_park   UUID := 'a0000001-0000-0000-0000-000000000003';
  lm_hapenny        UUID := 'a0000001-0000-0000-0000-000000000004';
  lm_temple_bar     UUID := 'a0000001-0000-0000-0000-000000000005';
  lm_grafton        UUID := 'a0000001-0000-0000-0000-000000000006';
  lm_guinness       UUID := 'a0000001-0000-0000-0000-000000000007';
  lm_dublin_castle  UUID := 'a0000001-0000-0000-0000-000000000008';
  lm_nat_gallery    UUID := 'a0000001-0000-0000-0000-000000000009';
  lm_nat_museum     UUID := 'a0000001-0000-0000-0000-000000000010';
  lm_merrion_sq     UUID := 'a0000001-0000-0000-0000-000000000011';
  lm_howth          UUID := 'a0000001-0000-0000-0000-000000000012';
  lm_custom_house   UUID := 'a0000001-0000-0000-0000-000000000013';
  lm_kilmainham     UUID := 'a0000001-0000-0000-0000-000000000014';
  lm_chester_beatty UUID := 'a0000001-0000-0000-0000-000000000015';
  lm_little_museum  UUID := 'a0000001-0000-0000-0000-000000000016';
  lm_st_michans     UUID := 'a0000001-0000-0000-0000-000000000017';
  lm_malahide       UUID := 'a0000001-0000-0000-0000-000000000018';
  lm_dun_laoghaire  UUID := 'a0000001-0000-0000-0000-000000000019';
  lm_glasnevin      UUID := 'a0000001-0000-0000-0000-000000000020';

  -- Expedition UUID
  exp_art_walk      UUID := 'e0000001-0000-0000-0000-000000000001';
  exp_food_tour     UUID := 'e0000001-0000-0000-0000-000000000002';

BEGIN

  -- ── Resolve auth user UUIDs (with Fallback for local testing) ──────────────
  -- Note: In production/Supabase, create these 4 users in the Auth dashboard.
  -- These fallbacks allow the script to RUN even if you haven't created them yet.
  
  SELECT id INTO alice_id  FROM auth.users WHERE email = 'alice@explorify.test';
  IF alice_id IS NULL THEN alice_id := 'f0000000-0000-0000-0000-000000000001'; END IF;
  
  SELECT id INTO marco_id  FROM auth.users WHERE email = 'marco@explorify.test';
  IF marco_id IS NULL THEN marco_id := 'f0000000-0000-0000-0000-000000000002'; END IF;
  
  SELECT id INTO sophie_id FROM auth.users WHERE email = 'sophie@explorify.test';
  IF sophie_id IS NULL THEN sophie_id := 'f0000000-0000-0000-0000-000000000003'; END IF;
  
  SELECT id INTO dev_id    FROM auth.users WHERE email = 'dev@explorify.test';
  IF dev_id IS NULL THEN dev_id := 'f0000000-0000-0000-0000-000000000004'; END IF;

  -- ── Sync auth users into public.users (backend route service needs this) ──
  -- total_points mirrors XP: Alice 1850, Marco 2600, Sophie 0, Dev 5000
  INSERT INTO users (id, email, display_name, total_points, preferences)
  VALUES
    (alice_id,  'alice@explorify.test',  'Alice Chen',  1850, '{"walking_speed_kmh": 4.5, "walk_pace_samples": [], "visitor_type": "tourist", "preferred_categories": ["architecture", "history"]}'::jsonb),
    (marco_id,  'marco@explorify.test',  'Marco Walsh',  2600, '{"walking_speed_kmh": 5.2, "walk_pace_samples": [], "visitor_type": "local", "preferred_categories": ["nightlife", "food"]}'::jsonb),
    (sophie_id, 'sophie@explorify.test', 'Sophie Kim',      0, '{"walking_speed_kmh": 4.5, "walk_pace_samples": [], "visitor_type": "tourist", "preferred_categories": ["art", "nature"]}'::jsonb),
    (dev_id,    'dev@explorify.test',    'Dev Admin',    5000, '{"walking_speed_kmh": 5.0, "walk_pace_samples": [], "visitor_type": "local", "preferred_categories": ["architecture", "history", "food", "art", "nature", "nightlife"]}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    total_points = EXCLUDED.total_points,
    preferences  = EXCLUDED.preferences;

  -- ── ... (Landmarks section remains same) ...

  -- ── 4. EXPEDITIONS (2 active, with landmarks as meeting points) ──────────

  INSERT INTO expeditions (id, title, created_by, creator_name,
    landmark_id, landmark_name, landmark_lat, landmark_lon,
    categories, group_size, duration, dna_only, status, is_narrative, created_at)
  VALUES
    (exp_art_walk, 'Georgian Art Morning Walk',
      alice_id, 'Alice Chen',
      lm_merrion_sq, 'Merrion Square', 53.3391, -6.2484,
      ARRAY['art','architecture'], 6, '2hr', false, 'active', false, NOW() - INTERVAL '2 hours'),
    (exp_food_tour, 'Street Food Safari',
      dev_id, 'Dev Admin',
      lm_temple_bar, 'Temple Bar', 53.3452, -6.2644,
      ARRAY['food'], 4, '1hr', false, 'active', false, NOW() - INTERVAL '30 minutes')
  ON CONFLICT (id) DO NOTHING;


  -- ── 5. EXPEDITION MEMBERS ─────────────────────────────────────────────────

  INSERT INTO expedition_members (expedition_id, user_id, user_name, joined_at)
  VALUES
    -- Art walk: Alice (creator) + Marco + Dev
    (exp_art_walk, alice_id, 'Alice Chen',  NOW() - INTERVAL '2 hours'),
    (exp_art_walk, marco_id, 'Marco Walsh', NOW() - INTERVAL '1 hour 45 minutes'),
    (exp_art_walk, dev_id,   'Dev Admin',   NOW() - INTERVAL '1 hour 30 minutes'),
    -- Food tour: Dev (creator) + Alice + Marco
    (exp_food_tour, dev_id,   'Dev Admin',   NOW() - INTERVAL '30 minutes'),
    (exp_food_tour, alice_id, 'Alice Chen',  NOW() - INTERVAL '25 minutes'),
    (exp_food_tour, marco_id, 'Marco Walsh', NOW() - INTERVAL '20 minutes')
  ON CONFLICT (expedition_id, user_id) DO NOTHING;


  -- ── 6. MESSAGES ──────────────────────────────────────────────────────────

  -- Art walk chat history
  INSERT INTO messages (expedition_id, sender_id, sender_name, content, type, metadata, created_at)
  VALUES
    (exp_art_walk, alice_id, 'Alice Chen',
      'Starting the Georgian Art Morning Walk! Meet me at the Oscar Wilde statue in Merrion Square.',
      'system', '{}', NOW() - INTERVAL '2 hours'),
    (exp_art_walk, alice_id, 'Alice Chen',
      'I''m at the gate on Merrion Square North. See the green railings!',
      'text', '{}', NOW() - INTERVAL '1 hour 58 minutes'),
    (exp_art_walk, marco_id, 'Marco Walsh',
      'On my way, 5 minutes out',
      'text', '{}', NOW() - INTERVAL '1 hour 50 minutes'),
    (exp_art_walk, marco_id, 'Marco Walsh',
      'Just checked in at Merrion Square',
      'check_in', '{"landmark":{"name":"Merrion Square","xp":320,"category":"Architecture","color":"#00C9B1"}}',
      NOW() - INTERVAL '1 hour 44 minutes'),
    (exp_art_walk, dev_id, 'Dev Admin',
      'Heading to the National Gallery next — anyone want to skip the queue and go to the Impressionist wing directly?',
      'text', '{}', NOW() - INTERVAL '1 hour 20 minutes'),
    (exp_art_walk, alice_id, 'Alice Chen',
      'Yes! The Monet is unmissable',
      'text', '{}', NOW() - INTERVAL '1 hour 18 minutes'),
    (exp_art_walk, dev_id, 'Dev Admin',
      'Vote: Where should we go after the National Gallery?',
      'vote',
      '{"options":[{"label":"Chester Beatty Library","votes":1},{"label":"Little Museum","votes":0},{"label":"Grafton Street coffee","votes":0}],"totalVotes":1}',
      NOW() - INTERVAL '45 minutes'),
    (exp_art_walk, marco_id, 'Marco Walsh',
      'Just checked in at National Gallery of Ireland',
      'check_in', '{"landmark":{"name":"National Gallery of Ireland","xp":320,"category":"Art","color":"#00C9B1"}}',
      NOW() - INTERVAL '30 minutes');

  -- Food tour chat history
  INSERT INTO messages (expedition_id, sender_id, sender_name, content, type, metadata, created_at)
  VALUES
    (exp_food_tour, dev_id, 'Dev Admin',
      'Street Food Safari is live! Starting at Temple Bar. Follow the smell of garlic 🧄',
      'system', '{}', NOW() - INTERVAL '30 minutes'),
    (exp_food_tour, dev_id, 'Dev Admin',
      'I''m at the square. There''s an amazing crepe stall — try the savoury one',
      'text', '{}', NOW() - INTERVAL '28 minutes'),
    (exp_food_tour, alice_id, 'Alice Chen',
      'Just arrived! Where exactly?',
      'text', '{}', NOW() - INTERVAL '24 minutes'),
    (exp_food_tour, dev_id, 'Dev Admin',
      'Near the central square, opposite the Merchant''s Arch',
      'text', '{}', NOW() - INTERVAL '22 minutes'),
    (exp_food_tour, marco_id, 'Marco Walsh',
      'Found you all! This crepe is incredible',
      'text', '{}', NOW() - INTERVAL '18 minutes'),
    (exp_food_tour, alice_id, 'Alice Chen',
      'Just checked in at Temple Bar',
      'check_in', '{"landmark":{"name":"Temple Bar","xp":150,"category":"Food","color":"#F5A623"}}',
      NOW() - INTERVAL '15 minutes');

END $$;
