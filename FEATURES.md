# Explorify — Implemented Features

Last updated: 2026-04-01

---

## Core App

### Authentication
**Status:** Done
**Files:** `mobile/src/screens/LoginScreen.js`, `mobile/src/store/useStore.js`, `mobile/src/services/supabase.js`, `mobile/src/navigation/AppNavigator.js`
Supabase email/password auth. Session persisted via AsyncStorage. Auth state synced to Zustand store (`authUser`, `isAuthenticated`). Signs in → syncs server-side collection and profile via `syncFromSupabase`.

---

### Onboarding (2-step)
**Status:** Done
**Files:** `mobile/src/screens/OnboardingScreen.js`, `mobile/src/store/useStore.js`
Step 1: Category interests grid (Architecture, Food, Nature, History, Art, Nightlife).
Step 2: Visitor type card picker — Tourist vs Local. Feeds into adaptive route scoring.
Persisted to AsyncStorage + synced to Supabase `user_profiles`.

---

### Map Screen (TomTom 3D)
**Status:** Done
**Files:** `mobile/src/screens/MapScreen.js`, `mobile/src/components/explorify/TomTomMap.js`
- 3D tilted perspective (`pitch: 60`, `zoom: 17`, `dragRotate: true`)
- 3D buildings via `fill-extrusion` layer using OSM building heights
- Landmark markers: coloured 3D orb + stem + shadow, keyed by tier (gold/teal/purple)
- Expedition markers: coral pulsing ring + map emoji dot
- Fallback to TCD Dublin coordinates if GPS unavailable
- `useMemo` on WebView source prevents reload on re-render
- `touchstart` + `preventDefault` + `{ passive: false }` fixes marker tap causing map pan
- Battery warning banner (amber/red) shown when battery < 20%

---

### Landmarks
**Status:** Done
**Files:** `mobile/src/services/supabase.js` (`fetchAllLandmarks`, `fetchNearbyLandmarks`), `database/migrations/002_create_landmarks.sql`, `database/migrations/006_adaptive_features.sql`
- All landmarks fetched from Supabase, no radius filter on map
- 3 tiers: `public` (gold), `discovered` (teal), `hidden` (purple)
- `tier` column added via migration 006
- Distance computed client-side via `haversineDistance`

---

### Landmark Detail & Check-in
**Status:** Done
**Files:** `mobile/src/screens/LandmarkDetailScreen.js`, `mobile/src/store/useStore.js`, `mobile/src/services/supabase.js`
GPS proximity check (≤100m) before check-in allowed. XP awarded by tier: public 150, discovered 320, hidden 600. Check-in saved to Supabase `collections` and local Zustand store.

---

### Nearby Screen
**Status:** Done
**Files:** `mobile/src/screens/NearbyScreen.js`
Bottom sheet with radius toggle (200m / 500m / 1000m). Fetches from Supabase. Shows tier icon, category colour, distance. Taps navigate to LandmarkDetail.

---

### Profile Screen
**Status:** Done
**Files:** `mobile/src/screens/ProfileScreen.js`
- Exploration DNA radar chart (SVG, 8 axes) — computed from collection
- Explorer type derived from most-visited category
- Stats grid: landmarks, quests, streak, cities
- Achievements: 6 badges unlocked by real progress
- Sign out

---

### Quests
**Status:** Done
**Files:** `mobile/src/store/useStore.js`, `mobile/src/screens/MapScreen.js`
6 quests (Heritage Trail, Street Food Safari, Through the Ages, Art Discovery, Into the Wild, After Dark). Active quest strip on map shows progress. Quest derived from user interests if none explicitly set.

---

## Expeditions

### Create Expedition
**Status:** Done
**Files:** `mobile/src/screens/CreateExpeditionScreen.js`, `mobile/src/services/supabase.js` (`createExpedition`)
Title, category multi-select, meeting point picker (dropdown of nearby landmarks from DB with tier colours), group size stepper (2–12), duration chips, DNA-only toggle. Saves to Supabase `expeditions` + auto-joins creator as first member. Navigates to ExpeditionChat on launch.

---

### Expedition Preview (Join)
**Status:** Done
**Files:** `mobile/src/screens/ExpeditionPreviewScreen.js`, `mobile/src/services/supabase.js` (`joinExpedition`)
Animated bottom sheet. Shows leader info, category pills, DNA match %, member avatars, spots left, meeting point, time. "Join Expedition" calls `joinExpedition` (writes to DB) then opens chat. "Peek Inside" enters chat without joining.

---

### Expedition Chat (Real-time)
**Status:** Done
**Files:** `mobile/src/screens/ExpeditionChatScreen.js`, `mobile/src/components/explorify/ChatBubbles.js`, `mobile/src/services/supabase.js`
- Loads messages from Supabase on mount
- Subscribes to `postgres_changes` for live incoming messages
- Optimistic send: message appears instantly, replaced with persisted version on save
- Deduplication: Realtime events for own messages are ignored if already in state
- Message types: `text`, `check_in` (landmark card), `vote` (waypoint vote), `system`
- Mini-map strip with animated coral dots + blinking LIVE badge
- Pinned landmark bar showing meeting point
- `setMode('expedition')` on mount → expedition theme; cleanup on unmount

---

### Expeditions on Map
**Status:** Done
**Files:** `mobile/src/screens/MapScreen.js`, `mobile/src/components/explorify/TomTomMap.js`
Active expeditions fetched alongside landmarks on map load. Rendered as coral pulsing ring markers in the WebView. Tapping → `goToExpedition` → `ExpeditionPreview`. "Continue Expedition" in action sheet re-enters ExpeditionChat for joined expeditions.

---

## Database

### Migrations
| File | What it creates |
|------|----------------|
| `001_create_users.sql` | `public.users` — backend profile + `total_points` |
| `002_create_landmarks.sql` | `landmarks` — category enum, accessibility, indoor, points |
| `003_create_collections.sql` | `collections` — check-in history |
| `004_create_routes.sql` | `routes` — saved route history |
| `005_create_expeditions.sql` | `expeditions`, `expedition_members`, `messages` — RLS + Realtime |
| `006_adaptive_features.sql` | `tier` on landmarks, `visitor_type` on `user_profiles`, `dwell_time_min` + mobile columns on `collections`, fixes `collections.user_id` FK to reference `auth.users` |

### Test Data
**File:** `database/seeds/001_test_data.sql`
20 Dublin landmarks (8 public, 6 discovered, 6 hidden). 4 test users with different XP/visitor type. 10–20 check-ins per user with real dwell times. 2 active expeditions with GPS coordinates. Full chat history (text, check-in, vote, system messages).

| User | Email | Password | XP | Visitor Type | Tests |
|------|-------|----------|----|--------------|-------|
| Alice Chen | alice@explorify.test | TestPass123! | 1,850 | Tourist | Dwell time, interest decay, discovered tier |
| Marco Walsh | marco@explorify.test | TestPass123! | 2,600 | Local | Hidden tier, local scoring, novelty bonus |
| Sophie Kim | sophie@explorify.test | TestPass123! | 0 | Tourist | New user flow, public-only landmarks |
| Dev Admin | dev@explorify.test | TestPass123! | 5,000 | Local | All features, both expeditions, full chat |

---

## Adaptive Features (Route Service)

### Feature 4 — Time-of-Day Adaptation
**Status:** Done
**Files:** `backend/src/services/routeService.js`
`TIME_WINDOWS` maps 4 time slots (morning/midday/evening/night) to category weight bonuses. Injected as `currentHour` (server clock) into composite score. Morning boosts nature/food, midday boosts museums/art, evening boosts architecture/nightlife. Weight: 14% of composite score.

---

### Feature 6 — Visitor Type (Tourist vs Local)
**Status:** Done
**Files:** `backend/src/services/routeService.js`, `mobile/src/screens/OnboardingScreen.js`, `mobile/src/store/useStore.js`, `mobile/src/services/supabase.js`, `database/migrations/006_adaptive_features.sql`
Tourist: boosts popular, easy-to-reach landmarks (low `points`). Local: boosts obscure, high-value spots. Stored in `user_profiles.visitor_type`. Read from DB per request if `userId` present, else from `preferences.visitor_type`. Weight: 7%.

---

### Feature 7 — Extended Weather Adaptation
**Status:** Done
**Files:** `mobile/src/services/weather.js`, `backend/src/services/routeService.js`
Weather service now returns `isCold` (<8°C), `isHot` (>25°C), `isWindy` (>6 m/s), `isClear` (mild + calm). Route service: heavy rain forces `is_indoor = true` in SQL query; cold+windy boosts indoor; hot boosts shaded spots; clear boosts outdoor. Weight: 8%.

---

### Feature 10 — Adaptive Difficulty (Tier Unlocking)
**Status:** Done
**Files:** `backend/src/services/routeService.js`
Uses `total_points` from `public.users` (queried per request). 0–499 XP: public-only (soft penalty on discovered/hidden). 500–1999 XP: discovered unlocked. 2000+ XP: hidden accessible. Soft scoring rather than hard exclusion — route can still fill time budget. Weight: 4%.

---

### Feature 2 — Dwell Time Learning
**Status:** Done
**Files:** `backend/src/services/routeService.js`, `mobile/src/services/supabase.js` (`fetchUserDwellTimes`), `database/migrations/006_adaptive_features.sql`
Backend JOINs `collections` + `landmarks` to compute per-user per-category avg dwell time. Used in `buildRoute` via `getVisitTime()` instead of static `avg_visit_duration_min`. Route response includes `visit_duration_min` per stop. Mobile helper `fetchUserDwellTimes` aggregates from Supabase for client-side use. Falls back to static value if no history.

---

### Feature 5 — Interest Decay / Novelty Bonus
**Status:** Done
**Files:** `backend/src/services/routeService.js`, `mobile/src/services/supabase.js` (`fetchCategoryCounts`)
`getNoveltyBonus()` scores 0→0.25 based on how under-explored a category is. Most-visited category gets 0 bonus; never-visited gets 0.25 boost. Prevents route engine from looping the same categories forever. `fetchCategoryCounts` aggregates from Supabase for client to send as `preferences.category_counts`. Weight: 12%.

---

### Feature 8 — Battery-Aware Routing
**Status:** Done
**Files:** `mobile/src/hooks/useBattery.js`, `mobile/src/screens/MapScreen.js`
`useBattery` hook reads battery level + charging state, subscribes to live changes. `getAdjustedBudget(minutes)` caps route time at 60 min (low, <20%) or 30 min (critical, <10%). `reduceGPS` flag available for polling reduction. MapScreen shows amber/red banner when battery low and not charging. All restrictions lifted when charging.

---

## Planned / Not Yet Implemented

| Feature | Notes |
|---------|-------|
| CV Camera Landmark ID | Plan file exists at `~/.claude/plans/ethereal-tumbling-sprout.md`. Uses Google Cloud Vision `LANDMARK_DETECTION`. Needs `expo-camera` install + Vision API key. |
| Repeat-Visit Avoidance | Score-down already-visited landmarks in route service. Zero new data — collection is available. |
| Route Generation UI | Mobile screen to call the backend route API with user context (weather, battery, visitor type, category counts). |
| DM / Direct Messages | `messages` table supports DMs (`dm_peer_id`). `sendDirectMessage` / `fetchDirectMessages` in `supabase.js`. UI not built. |
| Dwell Time Tracking | `dwell_time_min` column exists in `collections`. Need to track time between "arrive" and "check in" in `LandmarkDetailScreen`. |
| Group / Social Context | "Who are you exploring with?" selector (Solo / Kids / Elderly / Group) before route gen. |
