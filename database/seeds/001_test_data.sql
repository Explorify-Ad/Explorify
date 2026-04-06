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

  -- ── Resolve auth user UUIDs ────────────────────────────────────────────────
  SELECT id INTO alice_id  FROM auth.users WHERE email = 'alice@explorify.test';
  SELECT id INTO marco_id  FROM auth.users WHERE email = 'marco@explorify.test';
  SELECT id INTO sophie_id FROM auth.users WHERE email = 'sophie@explorify.test';
  SELECT id INTO dev_id    FROM auth.users WHERE email = 'dev@explorify.test';

  IF alice_id IS NULL OR marco_id IS NULL OR sophie_id IS NULL OR dev_id IS NULL THEN
    RAISE EXCEPTION 'One or more auth users not found. Create all 4 users in Supabase Dashboard first.';
  END IF;

  -- ── Sync auth users into public.users (backend route service needs this) ──
  -- total_points mirrors XP: Alice 1850, Marco 2600, Sophie 0, Dev 5000
  INSERT INTO users (id, email, display_name, total_points)
  VALUES
    (alice_id,  'alice@explorify.test',  'Alice Chen',  1850),
    (marco_id,  'marco@explorify.test',  'Marco Walsh',  2600),
    (sophie_id, 'sophie@explorify.test', 'Sophie Kim',      0),
    (dev_id,    'dev@explorify.test',    'Dev Admin',    5000)
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    total_points = EXCLUDED.total_points;

  -- ── 1. LANDMARKS (20 Dublin locations) ────────────────────────────────────
  INSERT INTO landmarks (id, name, description, latitude, longitude, category,
    accessibility_level, is_indoor, points, avg_visit_duration_min, tier)
  VALUES
    -- ── PUBLIC tier (10 pts, well-known) ──────────────────────────────────
    (lm_trinity,       'Trinity College Dublin',
      'Founded 1592. Home to the Book of Kells and the Long Room library.',
      53.3454, -6.2593, 'historical',    4, false, 10, 45, 'public'),
    (lm_st_patrick,    'St. Patrick''s Cathedral',
      'Ireland''s largest cathedral, founded in 1191 on the site of a holy well.',
      53.3391, -6.2706, 'historical',    5, true,  10, 30, 'public'),
    (lm_phoenix_park,  'Phoenix Park',
      'One of the largest enclosed urban parks in Europe at 707 hectares.',
      53.3572, -6.3264, 'nature',        5, false, 10, 60, 'public'),
    (lm_hapenny,       'Ha''penny Bridge',
      'Iconic cast-iron pedestrian bridge over the Liffey, built in 1816.',
      53.3466, -6.2625, 'landmark',      5, false, 10, 15, 'public'),
    (lm_temple_bar,    'Temple Bar',
      'Dublin''s cultural quarter — cobblestone streets, galleries, and pubs.',
      53.3452, -6.2644, 'shopping',      5, false, 10, 45, 'public'),
    (lm_grafton,       'Grafton Street',
      'Pedestrianised premier shopping street with buskers and flower sellers.',
      53.3403, -6.2590, 'shopping',      5, false, 10, 30, 'public'),
    (lm_guinness,      'Guinness Storehouse',
      'Seven-storey visitor experience inside the St. James''s Gate Brewery.',
      53.3418, -6.2868, 'cultural',      4, true,  15, 90, 'public'),
    (lm_dublin_castle, 'Dublin Castle',
      'Built by King John of England c. 1204. Now a government complex.',
      53.3430, -6.2673, 'historical',    4, false, 12, 40, 'public'),

    -- ── DISCOVERED tier (18-22 pts, interesting) ──────────────────────────
    (lm_nat_gallery,   'National Gallery of Ireland',
      'Ireland''s national art collection spanning 700 years of European art.',
      53.3411, -6.2524, 'cultural',      5, true,  20, 75, 'discovered'),
    (lm_nat_museum,    'National Museum of Ireland',
      'Celtic treasures, Viking artefacts, and the Bog Bodies collection.',
      53.3402, -6.2537, 'historical',    5, true,  20, 60, 'discovered'),
    (lm_merrion_sq,    'Merrion Square',
      'Georgian architecture surrounding a beautiful public park with Oscar Wilde statue.',
      53.3391, -6.2484, 'architecture',  4, false, 18, 30, 'discovered'),
    (lm_howth,         'Howth Cliff Walk',
      'Dramatic 6km coastal loop with views of Dublin Bay and Ireland''s Eye island.',
      53.3884, -6.0676, 'nature',        3, false, 22, 90, 'discovered'),
    (lm_custom_house,  'Custom House',
      'Neoclassical masterpiece by James Gandon, completed 1791.',
      53.3477, -6.2508, 'architecture',  4, false, 18, 20, 'discovered'),
    (lm_kilmainham,    'Kilmainham Gaol',
      'Preserved Victorian prison and site of the execution of 1916 Rising leaders.',
      53.3417, -6.3101, 'historical',    3, true,  20, 60, 'discovered'),

    -- ── HIDDEN tier (28-45 pts, off-the-beaten-path) ──────────────────────
    (lm_chester_beatty,'Chester Beatty Library',
      'World-class collection of manuscripts, prints, and decorative arts.',
      53.3432, -6.2678, 'cultural',      5, true,  35, 60, 'hidden'),
    (lm_little_museum, 'The Little Museum of Dublin',
      'The story of Dublin''s 20th century in one Georgian townhouse.',
      53.3396, -6.2560, 'cultural',      5, true,  30, 45, 'hidden'),
    (lm_st_michans,    'St. Michan''s Church Vaults',
      'Underground vaults with 800-year-old mummified remains.',
      53.3479, -6.2742, 'historical',    2, true,  40, 45, 'hidden'),
    (lm_malahide,      'Malahide Castle & Gardens',
      'Beautifully restored 12th-century castle surrounded by 260 acres of parkland.',
      53.4500, -6.1545, 'historical',    3, false, 45, 90, 'hidden'),
    (lm_dun_laoghaire, 'Dún Laoghaire Pier',
      'Victorian granite pier with unobstructed views across Dublin Bay.',
      53.2937, -6.1326, 'landmark',      4, false, 28, 45, 'hidden'),
    (lm_glasnevin,     'Glasnevin Cemetery & Museum',
      'Final resting place of Daniel O''Connell, Michael Collins, and Éamon de Valera.',
      53.3659, -6.2705, 'historical',    3, false, 32, 60, 'hidden')

  ON CONFLICT (id) DO NOTHING;


  -- ── 2. USER PROFILES ──────────────────────────────────────────────────────

  INSERT INTO user_profiles (id, display_name, interests, visitor_type, updated_at)
  VALUES
    -- Alice: architecture/history tourist, 1850 XP → discovered tier
    (alice_id,  'Alice Chen',  ARRAY['architecture','history'],  'tourist', NOW()),
    -- Marco: nightlife/food local, 2600 XP → hidden tier
    (marco_id,  'Marco Walsh', ARRAY['nightlife','food'],        'local',   NOW()),
    -- Sophie: art/nature tourist, brand new user
    (sophie_id, 'Sophie Kim',  ARRAY['art','nature'],            'tourist', NOW()),
    -- Dev: all-rounder local, power user
    (dev_id,    'Dev Admin',   ARRAY['architecture','history','food','art','nature','nightlife'], 'local', NOW())
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    interests    = EXCLUDED.interests,
    visitor_type = EXCLUDED.visitor_type,
    updated_at   = EXCLUDED.updated_at;


  -- ── 3. COLLECTIONS (check-in history with dwell times) ───────────────────

  -- Alice: heavy architecture & history, some nature
  INSERT INTO collections (user_id, landmark_id, landmark_name, landmark_category,
    landmark_tier, xp_earned, dwell_time_min, visited_at)
  VALUES
    (alice_id, lm_trinity,      'Trinity College Dublin',        'Architecture', 'public',     150, 52, NOW() - INTERVAL '60 days'),
    (alice_id, lm_st_patrick,   'St. Patrick''s Cathedral',      'History',      'public',     150, 38, NOW() - INTERVAL '55 days'),
    (alice_id, lm_dublin_castle,'Dublin Castle',                 'History',      'public',     150, 45, NOW() - INTERVAL '50 days'),
    (alice_id, lm_hapenny,      'Ha''penny Bridge',              'Architecture', 'public',     150, 12, NOW() - INTERVAL '48 days'),
    (alice_id, lm_merrion_sq,   'Merrion Square',                'Architecture', 'discovered', 320, 28, NOW() - INTERVAL '40 days'),
    (alice_id, lm_custom_house, 'Custom House',                  'Architecture', 'discovered', 320, 22, NOW() - INTERVAL '35 days'),
    (alice_id, lm_nat_museum,   'National Museum of Ireland',    'History',      'discovered', 320, 70, NOW() - INTERVAL '30 days'),
    (alice_id, lm_kilmainham,   'Kilmainham Gaol',               'History',      'discovered', 320, 65, NOW() - INTERVAL '20 days'),
    (alice_id, lm_phoenix_park, 'Phoenix Park',                  'Nature',       'public',     150, 55, NOW() - INTERVAL '10 days'),
    (alice_id, lm_grafton,      'Grafton Street',                'Food',         'public',     150, 35, NOW() - INTERVAL '5 days')
  ON CONFLICT (user_id, landmark_id) DO NOTHING;

  -- Marco: nightlife/food local, lots of discovered+hidden
  INSERT INTO collections (user_id, landmark_id, landmark_name, landmark_category,
    landmark_tier, xp_earned, dwell_time_min, visited_at)
  VALUES
    (marco_id, lm_temple_bar,   'Temple Bar',                    'Food',         'public',     150, 90, NOW() - INTERVAL '90 days'),
    (marco_id, lm_grafton,      'Grafton Street',                'Food',         'public',     150, 25, NOW() - INTERVAL '85 days'),
    (marco_id, lm_guinness,     'Guinness Storehouse',           'Art',          'public',     150, 95, NOW() - INTERVAL '70 days'),
    (marco_id, lm_nat_gallery,  'National Gallery of Ireland',   'Art',          'discovered', 320, 80, NOW() - INTERVAL '60 days'),
    (marco_id, lm_little_museum,'The Little Museum of Dublin',   'Art',          'hidden',     600, 50, NOW() - INTERVAL '45 days'),
    (marco_id, lm_chester_beatty,'Chester Beatty Library',       'Art',          'hidden',     600, 65, NOW() - INTERVAL '30 days'),
    (marco_id, lm_hapenny,      'Ha''penny Bridge',              'Architecture', 'public',     150, 10, NOW() - INTERVAL '20 days'),
    (marco_id, lm_dun_laoghaire,'Dún Laoghaire Pier',            'Architecture', 'hidden',     600, 50, NOW() - INTERVAL '10 days')
  ON CONFLICT (user_id, landmark_id) DO NOTHING;

  -- Sophie: brand new, zero check-ins (tests new-user flow)

  -- Dev: power user — visited everything
  INSERT INTO collections (user_id, landmark_id, landmark_name, landmark_category,
    landmark_tier, xp_earned, dwell_time_min, visited_at)
  VALUES
    (dev_id, lm_trinity,       'Trinity College Dublin',        'Architecture', 'public',     150, 40, NOW() - INTERVAL '180 days'),
    (dev_id, lm_st_patrick,    'St. Patrick''s Cathedral',      'History',      'public',     150, 30, NOW() - INTERVAL '175 days'),
    (dev_id, lm_phoenix_park,  'Phoenix Park',                  'Nature',       'public',     150, 70, NOW() - INTERVAL '170 days'),
    (dev_id, lm_hapenny,       'Ha''penny Bridge',              'Architecture', 'public',     150, 10, NOW() - INTERVAL '165 days'),
    (dev_id, lm_temple_bar,    'Temple Bar',                    'Food',         'public',     150, 60, NOW() - INTERVAL '160 days'),
    (dev_id, lm_grafton,       'Grafton Street',                'Food',         'public',     150, 25, NOW() - INTERVAL '155 days'),
    (dev_id, lm_guinness,      'Guinness Storehouse',           'Art',          'public',     150, 90, NOW() - INTERVAL '150 days'),
    (dev_id, lm_dublin_castle, 'Dublin Castle',                 'History',      'public',     150, 40, NOW() - INTERVAL '145 days'),
    (dev_id, lm_nat_gallery,   'National Gallery of Ireland',   'Art',          'discovered', 320, 80, NOW() - INTERVAL '130 days'),
    (dev_id, lm_nat_museum,    'National Museum of Ireland',    'History',      'discovered', 320, 65, NOW() - INTERVAL '120 days'),
    (dev_id, lm_merrion_sq,    'Merrion Square',                'Architecture', 'discovered', 320, 25, NOW() - INTERVAL '110 days'),
    (dev_id, lm_howth,         'Howth Cliff Walk',              'Nature',       'discovered', 320, 95, NOW() - INTERVAL '100 days'),
    (dev_id, lm_custom_house,  'Custom House',                  'Architecture', 'discovered', 320, 18, NOW() - INTERVAL '90 days'),
    (dev_id, lm_kilmainham,    'Kilmainham Gaol',               'History',      'discovered', 320, 60, NOW() - INTERVAL '80 days'),
    (dev_id, lm_chester_beatty,'Chester Beatty Library',        'Art',          'hidden',     600, 62, NOW() - INTERVAL '60 days'),
    (dev_id, lm_little_museum, 'The Little Museum of Dublin',   'Art',          'hidden',     600, 48, NOW() - INTERVAL '50 days'),
    (dev_id, lm_st_michans,    'St. Michan''s Church Vaults',   'History',      'hidden',     600, 45, NOW() - INTERVAL '40 days'),
    (dev_id, lm_malahide,      'Malahide Castle & Gardens',     'History',      'hidden',     600, 90, NOW() - INTERVAL '30 days'),
    (dev_id, lm_dun_laoghaire, 'Dún Laoghaire Pier',            'Architecture', 'hidden',     600, 50, NOW() - INTERVAL '20 days'),
    (dev_id, lm_glasnevin,     'Glasnevin Cemetery & Museum',   'History',      'hidden',     600, 65, NOW() - INTERVAL '10 days')
  ON CONFLICT (user_id, landmark_id) DO NOTHING;


  -- ── 4. EXPEDITIONS (2 active, with landmarks as meeting points) ──────────

  INSERT INTO expeditions (id, title, created_by, creator_name,
    landmark_id, landmark_name, landmark_lat, landmark_lon,
    categories, group_size, duration, dna_only, status, created_at)
  VALUES
    (exp_art_walk, 'Georgian Art Morning Walk',
      alice_id, 'Alice Chen',
      lm_merrion_sq, 'Merrion Square', 53.3391, -6.2484,
      ARRAY['art','architecture'], 6, '2hr', false, 'active', NOW() - INTERVAL '2 hours'),
    (exp_food_tour, 'Street Food Safari',
      dev_id, 'Dev Admin',
      lm_temple_bar, 'Temple Bar', 53.3452, -6.2644,
      ARRAY['food'], 4, '1hr', false, 'active', NOW() - INTERVAL '30 minutes')
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
