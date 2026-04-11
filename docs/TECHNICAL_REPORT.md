# Explorify — Full Technical Report
### Architecture, Data Flows, System Design & Visualisations

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [Navigation Architecture](#4-navigation-architecture)
5. [State Management](#5-state-management)
6. [Services Layer](#6-services-layer)
7. [Recommendation Engine](#7-recommendation-engine)
8. [Real-Time Messaging](#8-real-time-messaging)
9. [Map Rendering Pipeline](#9-map-rendering-pipeline)
10. [Route Builder Pipeline](#10-route-builder-pipeline)
11. [Authentication & Session Flow](#11-authentication--session-flow)
12. [Expedition Lifecycle](#12-expedition-lifecycle)
13. [Theme System](#13-theme-system)
14. [Figure Placeholders (Eraser / Mermaid code)](#14-figure-placeholders)
15. [Visualisation Scripts (Python)](#15-visualisation-scripts)
16. [Unified Branch — v2 Feature Set](#16-unified-branch--v2-feature-set)

---

## 1. System Overview

Explorify is a context-aware, gamified city-exploration app for iOS built with React Native (Expo). It combines:

- A **PostgreSQL-backed** content graph (landmarks, collections, expeditions) hosted on **Supabase**
- A **client-side adaptive recommendation engine** scoring landmarks in real time across 7 signals
- A **WebView-embedded TomTom map** with custom marker rendering, isolated from React re-renders
- A **Zustand + AsyncStorage** local state layer that mirrors the server state and drives all UI
- **Supabase Realtime** pub/sub for group expedition chat
- Three external APIs: **TomTom Search v2** (POI discovery), **OpenWeatherMap** (weather), **expo-battery** (device state)

The app is fully offline-capable for read operations — the Zustand store is hydrated from AsyncStorage on boot, and Supabase sync runs opportunistically when the user is authenticated.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile runtime | Expo SDK (React Native) | iOS app container |
| UI | React Native core + `expo-linear-gradient`, `lucide-react-native` | Screens, components |
| Map | TomTom Maps Web SDK 6.25 inside `react-native-webview` | Interactive 3D map |
| Navigation | `@react-navigation/native` stack + bottom tabs | Screen routing |
| State | Zustand + `@react-native-async-storage` | Client state + local persistence |
| Backend / Auth | Supabase (PostgreSQL + GoTrue + Realtime) | DB, auth, subscriptions |
| Real-time | Supabase Realtime (PostgreSQL CDC via WebSocket) | Expedition group chat |
| Geospatial | Haversine (custom JS), `expo-location` | Distance calculations, GPS |
| Weather | OpenWeatherMap REST API | Current conditions |
| Battery | `expo-battery` | Adaptive routing |
| Styling | Inline `StyleSheet.create` + custom theme system | Design tokens |

---

## 3. Database Schema

### 3.1 Entity Relationship

Twelve tables across two schemas (`public` and Supabase's `auth`) after migration 011:

```
auth.users          (managed by Supabase GoTrue)
       │
       ├──< user_profiles      (1:1)
       ├──< collections        (1:many)
       ├──< expeditions        (1:many, as creator)
       ├──< expedition_members (1:many, as member)
       ├──< messages           (1:many, as sender)
       └──< quests             (1:many)

landmarks
       │
       └──< collections           (1:many, nullable FK)
       └──< expedition_landmarks  (1:many)
       
expeditions
       │
       ├──< expedition_members    (1:many)
       ├──< messages              (1:many, via expedition_id)
       ├──< expedition_landmarks  (1:many)
       └──< quests                (1:many)

communities
       │
       ├──< community_members  (1:many)
       └──< community_channels (1:many)

community_channels
       │
       └──< messages  (1:many, via channel_id)
```

### 3.2 Table Definitions

**`auth.users`** (Supabase managed)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR | |
| user_metadata | JSONB | Stores `name` |

---

**`user_profiles`**
| Column | Type | Constraint |
|--------|------|-----------|
| id | UUID PK | FK → auth.users(id) |
| display_name | VARCHAR(100) | |
| interests | TEXT[] | Default `{}` |
| visitor_type | TEXT | CHECK IN ('tourist','local'), default 'tourist' |
| updated_at | TIMESTAMPTZ | |

---

**`landmarks`** *(Migration 002 + 006)*
| Column | Type | Constraint |
|--------|------|-----------|
| id | UUID PK | |
| name | VARCHAR(255) | NOT NULL |
| latitude | DECIMAL(10,8) | NOT NULL |
| longitude | DECIMAL(11,8) | NOT NULL |
| category | VARCHAR(50) | CHECK IN ('historical','cultural','nature','shopping','sports','architecture','landmark') |
| tier | TEXT | CHECK IN ('public','discovered','hidden'), added migration 006 |
| accessibility_level | INT | CHECK 1–5 |
| is_indoor | BOOLEAN | Default false |
| description | TEXT | |
| points | INT | Default 10 |
| avg_visit_duration_min | INT | Default 30 |

*Indexes:* `category`, `tier`, `(latitude, longitude)`

---

**`collections`** *(Migration 003 + 006)*
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users(id) ON DELETE CASCADE |
| landmark_id | UUID | FK → landmarks(id) ON DELETE SET NULL, NULLABLE |
| landmark_name | TEXT | Denormalised for offline display |
| landmark_lat | DECIMAL(10,8) | |
| landmark_lon | DECIMAL(11,8) | |
| landmark_category | TEXT | |
| landmark_tier | TEXT | Default 'public' |
| xp_earned | INT | Default 0 |
| dwell_time_min | INT | CHECK > 0, nullable |
| visited_at | TIMESTAMPTZ | |
| UNIQUE | (user_id, landmark_id) | |

*Indexes:* `user_id`, `landmark_id`, composite `(user_id, landmark_category) WHERE dwell_time_min IS NOT NULL`

---

**`expeditions`** *(Migration 005 + 007)*
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| title | TEXT | NOT NULL |
| created_by | UUID | FK → auth.users(id) ON DELETE CASCADE |
| creator_name | TEXT | NOT NULL |
| landmark_id | UUID | Nullable anchor landmark |
| landmark_name | TEXT | |
| landmark_lat | DECIMAL(10,8) | Used for map pin placement |
| landmark_lon | DECIMAL(11,8) | |
| categories | TEXT[] | Default `{}` |
| group_size | INT | CHECK 2–12, default 4 |
| duration | TEXT | '30min'/'1hr'/'2hr'/etc |
| dna_only | BOOLEAN | Default true |
| status | TEXT | CHECK IN ('active','completed','cancelled','ended') |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-updated by trigger |

*RLS:* SELECT open to all; INSERT/UPDATE/DELETE restricted to `auth.uid() = created_by`

*Auto-expiry:* Any `active` expedition with `created_at < NOW() - 24h` is silently flipped to `ended` by `autoExpireExpeditions()` on every `fetchActiveExpeditions` call.

---

**`expedition_members`**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| expedition_id | UUID | FK → expeditions(id) ON DELETE CASCADE |
| user_id | UUID | FK → auth.users(id) ON DELETE CASCADE |
| user_name | TEXT | NOT NULL |
| joined_at | TIMESTAMPTZ | |
| UNIQUE | (expedition_id, user_id) | |

*RLS:* SELECT open; INSERT restricted to `auth.uid() = user_id`; DELETE restricted to own row.

---

**`messages`** *(updated migration 011)*
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| expedition_id | UUID | Nullable; FK → expeditions(id) |
| dm_peer_id | UUID | Nullable; FK → auth.users(id) |
| channel_id | UUID | Nullable; FK → community_channels(id) — added migration 011 |
| sender_id | UUID | FK → auth.users(id) |
| sender_name | TEXT | |
| content | TEXT | |
| type | TEXT | CHECK IN ('text','check_in','system','vote') |
| metadata | JSONB | Default `{}` |
| created_at | TIMESTAMPTZ | |
| CHECK | 3-way XOR | Exactly one of expedition_id / dm_peer_id / channel_id IS NOT NULL |

*Index:* `idx_messages_channel ON messages(channel_id, created_at)`

`REPLICA IDENTITY FULL` — required for Supabase Realtime to publish complete row data on INSERT.

*RLS:* Expedition messages visible only to members. DM messages visible only to sender and recipient. Channel messages visible to all community members.

---

**`communities`** *(migration 011)*
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | NOT NULL |
| description | TEXT | |
| theme | TEXT | |
| avatar_url | TEXT | |
| created_at | TIMESTAMPTZ | |

---

**`community_members`** *(migration 011)*
| Column | Type | Notes |
|--------|------|-------|
| community_id | UUID | FK → communities(id) ON DELETE CASCADE |
| user_id | UUID | FK → auth.users(id) ON DELETE CASCADE |
| joined_at | TIMESTAMPTZ | |
| PRIMARY KEY | (community_id, user_id) | |

---

**`community_channels`** *(migration 011)*
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| community_id | UUID | FK → communities(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| slug | TEXT | |
| type | TEXT | 'text' / 'announcements' |
| created_at | TIMESTAMPTZ | |

---

**`expedition_landmarks`** *(migration 011)*
| Column | Type | Notes |
|--------|------|-------|
| expedition_id | UUID | FK → expeditions(id) ON DELETE CASCADE |
| landmark_id | UUID | FK → landmarks(id) ON DELETE CASCADE |
| step_number | INT | Sequence position |
| story_fragment | TEXT | Narrative text for this step |
| PRIMARY KEY | (expedition_id, landmark_id) | |

---

**`quests`** *(migration 011)*
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users(id) ON DELETE CASCADE |
| expedition_id | UUID | FK → expeditions(id) ON DELETE SET NULL, nullable |
| status | TEXT | CHECK IN ('active','completed','claimed') |
| progress_count | INT | Default 0 |
| completed_at | TIMESTAMPTZ | nullable |

*RLS:* All operations restricted to `auth.uid() = user_id`

---

**New columns added to existing tables (migration 011):**

`users`: `detail_level TEXT DEFAULT 'overview'`, `language_pref TEXT DEFAULT 'en'`, `onboarding_group_context TEXT DEFAULT 'solo'`, `drift_detected_at TIMESTAMPTZ`, `drift_from_category TEXT`, `drift_to_category TEXT`

`landmarks`: `tags TEXT[] DEFAULT '{}'`

`collections`: `context JSONB DEFAULT '{}'`, `checked_in_at TIMESTAMPTZ DEFAULT NOW()`

`expeditions`: `description TEXT`, `category VARCHAR(50)`, `difficulty INTEGER DEFAULT 1`, `reward_xp INTEGER DEFAULT 500`, `required_count INTEGER DEFAULT 3`, `is_narrative BOOLEAN DEFAULT false`

---

## 4. Navigation Architecture

### 4.1 Screen Inventory

| Screen | Type | Entry point |
|--------|------|-------------|
| LoginScreen | Stack | Initial (unauthenticated) |
| SignupScreen | Stack | From Login |
| OnboardingScreen | Stack | After first login, before Main |
| Main (TabNavigator) | Tab container | After auth + onboarding |
| MapScreen | Tab | Map tab |
| QuestsScreen | Tab | Quests tab |
| RouteBuilderScreen | Tab | Route tab |
| CollectionScreen | Tab | Collection tab |
| ProfileScreen | Tab | Profile tab |
| LandmarkDetailScreen | Stack (modal) | From MapScreen marker tap |
| NearbyScreen | Stack (modal) | From MapScreen radar FAB |
| CreateExpeditionScreen | Stack (modal) | From MapScreen plus FAB |
| ExpeditionPreviewScreen | Stack (modal) | From MapScreen expedition pin tap |
| ExpeditionChatScreen | Stack (push) | From Preview join/continue |
| MyExpeditionsScreen | Stack (push) | From MapScreen plus FAB → My Expeditions |

### 4.2 Initial Route Resolution

```
App boot
  → useStore.hydrate()          reads AsyncStorage
  → supabase.auth.getSession()  restores JWT
  → onAuthStateChange listener  keeps auth in sync
  
  isAuthenticated?
    No  → initialRoute = 'Login'
    Yes → hasOnboarded?
            No  → initialRoute = 'Onboarding'
            Yes → initialRoute = 'Main'
```

---

## 5. State Management

### 5.1 Zustand Store Shape

**Persisted fields** (written to AsyncStorage key `@explorify_v1` on every mutation):

| Field | Type | Description |
|-------|------|-------------|
| hasOnboarded | boolean | Whether onboarding wizard was completed |
| userName | string | Display name |
| interests | string[] | Array of onboarding category IDs (lowercase) |
| visitorType | 'tourist' \| 'local' | |
| collection | CollectionEntry[] | All checked-in landmarks with XP, date |
| activeQuestId | string \| null | Currently active quest ID |
| completedQuests | string[] | Quest IDs whose XP was claimed |
| questBonusXP | number | Cumulative XP from quest + daily completions |
| dailyClaimed | Record\<string, boolean\> | ISO date strings of claimed daily challenges |

**Ephemeral fields** (not persisted — recreated from Supabase or reset on launch):

| Field | Type | Description |
|-------|------|-------------|
| authUser | \{ id, email, name \} \| null | Current session user |
| isAuthenticated | boolean | Derived from authUser |
| hydrated | boolean | True once AsyncStorage has been read |

### 5.2 Computed Getters

All getters are pure functions derived from persisted state — no subscriptions needed.

| Getter | Formula |
|--------|---------|
| `getTotalXP()` | `Σ collection[i].xpEarned + questBonusXP` |
| `getLevel()` | `floor(totalXP / 500) + 1` |
| `getCurrentXP()` | `totalXP % 500` (progress within current level) |
| `getStreak()` | Count consecutive days backward from today with ≥1 check-in |
| `getActiveQuest()` | Finds quest matching activeQuestId; computes adaptive target = `min(3 + floor(level/3), 8)` |
| `getSuggestedQuests()` | Sorts QUESTS by interest match (tourist) or novelty (local); returns 3 |
| `getDailyChallenge()` | Deterministic category from `dayNum % cats.length`; target = 1 (tourist) or 2 (local, even days) |
| `getCategoryAffinities()` | Exponential decay weights per category: `w = e^(−daysAgo/45)`; normalised 0–100 |
| `getUnlockedTiers()` | `{ public: true, discovered: level≥2, hidden: level≥6 }` |
| `getExplorerType()` | Top category by visit count → maps to one of 6 persona strings |
| `getDNAStats()` | 6-axis radar data, each axis normalised to max category count |

### 5.3 Persistence / Sync Flow

```
Action (e.g. checkIn)
  → set() updates in-memory Zustand state
  → _persist() serialises to AsyncStorage (fire-and-forget)
  → saveCheckIn(userId, landmark, xp) writes to Supabase collections table

Login / session restore
  → syncFromSupabase()
      → fetchCollections(userId) → merges into collection if server > local
      → fetchUserProfile(userId) → merges display_name, visitorType, interests
      → _persist() writes merged state to AsyncStorage
```

---

## 6. Services Layer

### 6.1 `supabase.js` — Function Inventory

| Function | DB Operation | Notes |
|----------|-------------|-------|
| `fetchAllLandmarks(lat, lon)` | SELECT * FROM landmarks | Returns normalised rows with Haversine distance annotation |
| `fetchNearbyLandmarks(lat, lon, r)` | Above + JS filter | Radius filter applied client-side |
| `saveCheckIn(userId, landmark, xp)` | UPSERT collections | ON CONFLICT (user_id, landmark_id) ignore |
| `fetchCollections(userId)` | SELECT collections WHERE user_id | Normalises to store shape |
| `saveUserProfile(userId, data)` | UPSERT user_profiles | |
| `fetchUserProfile(userId)` | SELECT user_profiles WHERE id | Returns null on error |
| `fetchUserDwellTimes(userId)` | SELECT category, dwell_time_min FROM collections | Returns per-category avg map |
| `fetchCategoryCounts(userId)` | SELECT landmark_category FROM collections | Returns `{ Category: count }` |
| `createExpedition(userId, name, data)` | INSERT expeditions + joinExpedition | Returns expedition row |
| `joinExpedition(expeditionId, userId, name)` | UPSERT expedition_members | ON CONFLICT ignore |
| `leaveExpedition(expeditionId, userId)` | DELETE expedition_members | |
| `fetchExpeditionMembers(expeditionId)` | SELECT expedition_members | Ordered by joined_at |
| `autoExpireExpeditions()` | UPDATE expeditions SET status='ended' WHERE status='active' AND created_at < cutoff | Called silently before every fetch |
| `fetchActiveExpeditions(lat, lon, r=10000)` | SELECT expeditions + expedition_members WHERE status='active' | JS radius filter 10km |
| `updateExpeditionStatus(id, status)` | UPDATE expeditions SET status | Used for creator End action |
| `fetchMyExpeditions(userId)` | SELECT via expedition_members join expeditions | Returns all joined expeditions |
| `fetchMessages(expeditionId)` | SELECT messages WHERE expedition_id | Ordered by created_at |
| `sendMessage(expeditionId, ...)` | INSERT messages | Returns inserted row |
| `sendDirectMessage(senderId, peerId, content)` | INSERT messages with dm_peer_id | |
| `fetchDirectMessages(userId, peerId)` | SELECT messages WHERE dm XOR filter | |
| `subscribeToMessages(expeditionId, cb)` | Realtime channel on INSERT | Returns channel handle |
| `subscribeToDMs(userId, cb)` | Realtime channel on INSERT dm_peer_id=userId | |
| `unsubscribe(channel)` | supabase.removeChannel | |
| `fetchCommunityChannels(communityId)` | SELECT community_channels WHERE community_id | Ordered by name |
| `fetchChannelMessages(channelId)` | SELECT messages WHERE channel_id | Ordered by created_at |
| `sendChannelMessage(channelId, userId, name, content)` | INSERT messages with channel_id | Returns inserted row |
| `subscribeToChannelMessages(channelId, cb)` | Realtime channel on INSERT for channel_id | Returns channel handle |

**`normaliseLandmark` output shape (updated):**

| Field | Source | Notes |
|-------|--------|-------|
| `id` | row.id | |
| `name` | row.name | |
| `lat` / `lon` | parsed floats | Internal use |
| `latitude` / `longitude` | same as lat/lon | Compatibility alias |
| `category` | `APP_CATEGORIES` pass-through or `CATEGORY_MAP[lower]` | Handles all 6 app categories |
| `tier` | row.tier \| 'public' | |
| `description` | row.description | |
| `points` | row.points \| 10 | |
| `avg_visit_duration_min` | row.avg_visit_duration_min \| 30 | Used by route builder |
| `is_indoor` | row.is_indoor \| false | Used for weather-aware routing |
| `accessibility_level` | row.accessibility_level \| 1 | Used for company-type routing |
| `distance` | haversine(userLat, userLon, lat, lon) | metres, null if no user location |

### 6.2 `tomtom.js` — Function Inventory

| Function | Purpose |
|----------|---------|
| `nearbySearch(lat, lon, radius, limit)` | TomTom Search API POI discovery (currently unused — landmarks come from DB) |
| `poiDetails(id)` | TomTom POI detail lookup |
| `haversineDistance(lat1, lon1, lat2, lon2)` | Great-circle distance in metres (Earth R = 6,371,000 m) |
| `toScreenCoords(...)` | Converts lat/lon offset to screen x/y pixels at a given zoom |

**Haversine formula:**
```
dLat = (lat2 - lat1) × π/180
dLon = (lon2 - lon1) × π/180
a = sin²(dLat/2) + cos(lat1×π/180) × cos(lat2×π/180) × sin²(dLon/2)
d = R × 2 × atan2(√a, √(1−a))
```

### 6.3 `weather.js`

Calls OpenWeatherMap `/data/2.5/weather` with `units=metric`. Returns:

| Field | Condition |
|-------|-----------|
| isRaining | `main` ∈ {Rain, Drizzle, Thunderstorm} |
| isCold | `temp < 8°C` |
| isHot | `temp > 25°C` |
| isWindy | `windSpeed > 6 m/s` |
| isClear | Clear/Clouds AND 12°≤temp≤24° AND windSpeed≤4 m/s |

### 6.4 Custom Hooks

| Hook | Returns | Update trigger |
|------|---------|---------------|
| `useWeather(lat, lon)` | `{ weather, loading, error }` | On lat/lon change |
| `useBattery()` | `{ batteryLevel, isCharging, tier, getAdjustedBudget, reduceGPS }` | `expo-battery` listeners |
| `useLocation()` | `{ location }` | Continuous GPS watch (expo-location) |

**Battery tier thresholds:**
- `< 0.10` → `critical` — hard cap 30 min route
- `< 0.20` → `low` — cap 60 min route
- `< 0.50` → `medium` — no cap, informational
- `≥ 0.50` or charging → `ok`

---

## 7. Recommendation Engine

### 7.1 Architecture

The engine lives entirely in `mobile/src/utils/recommendations.js`. It runs client-side at score time — no network calls. Three public exports:

```
buildContext({ weather, batteryTier })    → context object
buildPreferences({ interests, visitorType, collection }) → preferences object
getRecommendations(landmarks, preferences, context)  → sorted array with .score
```

### 7.2 `calculateScore` — Signal Breakdown

Base score: **50**. Additive/subtractive signals:

| Signal | Condition | Δ Score |
|--------|-----------|---------|
| Interest match | landmark.category ∈ preferred_categories | +20 |
| Local tier boost | local + hidden | +15 |
| Local tier boost | local + discovered | +8 |
| Tourist tier boost | tourist + public | +8 |
| Tourist points bonus | tourist; `min(points/3, 10)` | +0 to +10 |
| Novelty — fresh | category_counts[cat] == 0 | +12 |
| Novelty — light | category_counts[cat] < 3 | +5 |
| Already collected | id ∈ collected_ids | **−60** |
| Accessibility | accessibility_level ≥ accessibility_min | +5 |
| Rain + indoor | isRaining && is_indoor | +18 |
| Rain + outdoor | isRaining && !is_indoor | −15 |
| Hot + indoor | isHot && is_indoor | +8 |
| Clear + outdoor | isClear && !is_indoor | +6 |
| Windy + indoor | isWindy && is_indoor | +5 |
| Morning + Food | timeOfDay=='morning' | +10 |
| Morning + Nature | timeOfDay=='morning' | +8 |
| Afternoon + Architecture | timeOfDay=='afternoon' | +8 |
| Afternoon + History | timeOfDay=='afternoon' | +8 |
| Afternoon + Art | timeOfDay=='afternoon' | +6 |
| Evening + Nightlife | timeOfDay=='evening' | +18 |
| Evening + Art | timeOfDay=='evening' | +10 |
| Evening + Food | timeOfDay=='evening' | +8 |
| Night + Nightlife | timeOfDay=='night' | +14 |
| Battery low/critical + short visit (≤20 min) | | +12 |
| Battery low/critical + close landmark (<300 m) | | +8 |
| Battery low/critical + long visit (>45 min) | | −8 |

Final score clamped to **[0, 100]**.

### 7.3 Category Affinity (Recency Weighting)

`getCategoryAffinities()` in the store computes:

```
For each check-in c in collection:
  daysAgo = (now − c.checkedInAt) / 86400000
  w = e^(−daysAgo / 45)          // half-life 45 days
  weights[c.category] += w

Normalise by maxWeight, map to 0–100 affinity score
```

A check-in from 1 day ago contributes weight ≈ **0.978**.  
A check-in from 45 days ago contributes weight ≈ **0.368** (half-life).  
A check-in from 90 days ago contributes weight ≈ **0.135**.

### 7.4 Expedition DNA Match

Computed in `MapScreen.loadNearby` via `useStore.getState()`:

```
preferences = buildPreferences({ interests, visitorType, collection })
userCats = Set(preferences.preferred_categories)

For each expedition exp:
  score = 0
  For each cat in exp.categories:
    if cat ∈ userCats:           score += 40
    if category_counts[cat] ≥ 3: score += 20
    else if category_counts[cat] ≥ 1: score += 8
  raw = round(score / exp.categories.length)
  dnaMatch = clamp(raw + 30, 28, 97)
```

The `+30` base offset ensures even a zero-match shows 28–30 % (never zero), and the ceiling at 97 % preserves imperfection.

---

## 8. Real-Time Messaging

### 8.1 Transport

Supabase Realtime uses a WebSocket connection multiplexed across channels. Each expedition chat subscribes to one channel:

```
Channel name: expedition_messages:<expeditionId>
Event:        postgres_changes INSERT on messages
Filter:       expedition_id=eq.<expeditionId>
```

`REPLICA IDENTITY FULL` on `messages` table ensures the full new row is broadcast (not just the PK).

### 8.2 Message Lifecycle

```
User types message
  → sendMessage() → INSERT into messages
  → Optimistic UI: message appended to local state immediately
  → Realtime subscriber receives INSERT payload
  → onMessage(payload.new) appends to messages state
  → Deduplication: messages keyed by id, so duplicate insert is no-op
```

### 8.3 Message Types

| type | Rendered as |
|------|-------------|
| text | Standard chat bubble |
| system | Centred grey system note (joined/left/ended) |
| check_in | Landmark card embed |
| vote | Waypoint vote card |

---

## 9. Map Rendering Pipeline

### 9.1 WebView Isolation Strategy

TomTomMap renders a full TomTom Maps Web SDK instance inside `react-native-webview`. The HTML is built once via `buildHTML()` and memoised by `useMemo` on `[lat, lon, JSON.stringify(landmarks), JSON.stringify(expeditions)]`.

This means:
- Theme changes do NOT reload the WebView (no dependency on theme)
- Store updates (e.g. collection sync) do NOT reload the WebView
- Only actual data changes (new landmarks fetched, new expeditions) rebuild the HTML

### 9.2 Stable Callback Pattern

`loadNearby` in MapScreen uses `useCallback(fn, [])` — empty dependency array. Accessing user preferences for DNA match computation uses `useStore.getState()` (imperative read at call time, not reactive subscription), ensuring the callback reference stays stable across re-renders.

```
MapScreen mounts → useFocusEffect(loadNearby) fires
  → getCurrentLocation()
  → Promise.all([fetchAllLandmarks, fetchActiveExpeditions])
  → useStore.getState() → reads fresh { interests, visitorType, collection }
  → computes dnaMatch per expedition
  → React 18 batches: setLandmarks() + setExpeditions() → single render
  → TomTomMap source memo recomputes once → WebView loads once
```

### 9.3 Marker Types

| Marker | Shape | Color |
|--------|-------|-------|
| User location | 16px blue dot | #4A90D9 |
| Public landmark | Orb + stem + shadow | #F5A623 (amber) |
| Discovered landmark | Orb + stem + shadow | #00C9B1 (teal) |
| Hidden landmark | Orb + stem + shadow | #3D2B8E (purple) |
| Active expedition | 48px pulsing ring + 🗺️ dot | #FF6B6B (coral) |

Touch disambiguation: `touchstart` records start position; `touchmove` sets a `moved` flag if displacement > 8px; `touchend` ignores taps if `moved` is true (pan gesture).

---

## 10. Route Builder Pipeline

The route builder runs entirely on-device — no backend call. It replaces the former `api.post('/routes/generate')` with a local greedy algorithm using Supabase data.

### 10.1 Eight-Step Pipeline

```
Step 1  Location         getCurrentLocation() or expo-location fallback
Step 2  Battery cap      getAdjustedBudget(timeBudget) → adjustedBudget
Step 3  Data fetch       fetchAllLandmarks(lat, lon) from Supabase
Step 4  Filter           category ∩ selectedCats + getUnlockedTiers() + weather (rainy → no outdoor public)
Step 5  Score            For each landmark:
                           score = 1000 − distM×0.1
                           + 200 if unvisited
                           + 150 if rainy + is_indoor
                           + 100 if family + accessibility_level≥4
Step 6  Greedy pick      Sort by score desc; add landmark if usedMin + totalMin ≤ adjustedBudget + 10 grace
                         Stop when 85% of budget consumed
Step 7  Sequential walk  Recompute walk times stop-to-stop:
                           route[0]._walkMin = walk(origin → stop0)
                           route[i]._walkMin = walk(stop[i-1] → stop[i])
Step 8  Stats            totalMin = Σ (_walkMin + _visitMin); totalXP = Σ points×15
```

### 10.2 Company Type Signals

| Company Type | Extra Score Boost |
|--------------|------------------|
| `family` | +100 if `accessibility_level ≥ 4` |
| `elderly` | Same as family |
| `solo` / `date` / `friends` | No extra boost |

### 10.3 Walk Speed

Default: **`getWalkPaceKmh()`** from Zustand store (derived from `walkPaceSamples`).  
Fallback when < 2 pace samples recorded: **4.5 km/h**

```js
walkMinutes(distanceMeters, walkSpeedKmh) = round(distanceMeters / 1000 / walkSpeedKmh × 60)
```

### 10.4 Scrutability — "Why This Route?" Panel

`activeAdaptations` array built after route generation:

| Adaptation key | Trigger | UI label |
|----------------|---------|---------|
| `indoor_priority` | `weather.isRaining === true` | Indoor venues prioritised |
| `battery_cap` | `getAdjustedBudget().budget < timeBudget` | Route shortened for battery |
| `accessibility_boost` | `companyType === 'family'` | Accessible venues boosted |

The `AdaptationsPanel` component renders these as an expandable "Why this route?" card above the stop list.

### 10.5 Apple Maps Deep-Link

```
http://maps.apple.com/?saddr=<userLat>,<userLon>&daddr=<lat1>,<lon1>/<lat2>,<lon2>/...
```

---

## 11. Authentication & Session Flow

```
App launch
  ├─ useStore.hydrate()              → AsyncStorage → local state
  └─ supabase.auth.getSession()      → JWT from AsyncStorage

JWT valid?
  Yes → setAuthUser({ id, email, name })
        syncFromSupabase()           → fetchCollections + fetchUserProfile
  No  → setAuthUser(null)
        navigate to Login

onAuthStateChange listener (always active)
  SIGNED_IN event  → setAuthUser() + syncFromSupabase()
  SIGNED_OUT event → setAuthUser(null)

Login flow
  supabase.auth.signInWithPassword({ email, password })
    → JWT stored in AsyncStorage by Supabase client
    → onAuthStateChange fires SIGNED_IN
    → navigate to Onboarding (if not onboarded) or Main

Signup flow
  supabase.auth.signUp({ email, password, options: { data: { name } } })
    → creates auth.users row
    → onAuthStateChange fires SIGNED_IN
    → navigate to Onboarding

Sign out
  supabase.auth.signOut()
    → clears AsyncStorage session
    → setAuthUser(null)
    → navigate to Login
```

---

## 12. Expedition Lifecycle

### 12.1 States

```
active → ended     (auto-expire: created_at < NOW() − 24h)
active → ended     (creator taps End in chat ⋮ menu or My Expeditions)
active → cancelled (reserved, not currently used in UI)
active → completed (reserved, not currently used in UI)
```

### 12.2 Full Lifecycle

```
Creator fills CreateExpeditionScreen
  → createExpedition(userId, userName, formData)
      → INSERT expeditions (status='active')
      → joinExpedition(expeditionId, userId) → INSERT expedition_members
  → navigate to ExpeditionChatScreen

Other user opens MapScreen
  → fetchActiveExpeditions()
      → autoExpireExpeditions() (silent, fire-and-forget)
      → SELECT expeditions WHERE status='active'
      → JS filter: distance ≤ 10,000 m
      → DNA match computed per expedition
  → Expedition pin appears on map (pulsing coral ring)

User taps expedition pin
  → goToExpedition() → navigate to ExpeditionPreviewScreen
      → fetchExpeditionMembers() on mount (fresh DB check)
      → Button: "Join Expedition" if not member, "Continue Expedition" if member

User joins
  → joinExpedition(expeditionId, userId, userName)
  → navigate to ExpeditionChatScreen
  → subscribeToMessages(expeditionId, onMessage) → WebSocket

User leaves (member)
  → leaveExpedition(expeditionId, userId)
  → local state update (removed from list)

Creator ends
  → updateExpeditionStatus(expeditionId, 'ended')
  → local state update (moved to Past tab)
```

---

## 13. Theme System

### 13.1 Architecture

`ThemeContext` reads `useColorScheme()` from React Native to detect system dark mode. No user toggle exists — switching is fully automatic.

```
systemScheme = useColorScheme()   // 'light' | 'dark'
isDark = systemScheme === 'dark'
themeKey = isDark ? `dark_${mode}` : mode
theme = themes[themeKey] ?? themes[mode]
```

### 13.2 Theme Keys

**Shell tokens** (same structure for light and dark):

| Token | Light | Dark |
|-------|-------|------|
| sheetBg | #FFFDF8 | #12121f |
| cardBg | #FFFFFF | #1c1c2e |
| cardBgAlt | #F9FAFB | #22223a |
| border | rgba(0,0,0,0.07) | rgba(255,255,255,0.08) |
| textPrimary | #1A1A2E | #F1F0FF |
| textSecondary | #6B7280 | #9CA3B8 |
| textMuted | #9CA3AF | #6B7280 |
| inputBg | #F3F4F6 | #1c1c2e |
| overlayBg | rgba(0,0,0,0.35) | rgba(0,0,0,0.6) |

**Mode-specific tokens** (primary, secondary, surface):

| Mode | Primary | Secondary | Surface (light) | Surface (dark) |
|------|---------|-----------|-----------------|----------------|
| exploration | #F5A623 | #4A90D9 | #FFFDF8 | #0f0f1a |
| discovery | #00C9B1 | #3D2B8E | #F0FAFA | #0a1a1a |
| quest | #7C3AED | #F97316 | #FDFAF5 | #100f1a |
| expedition | #FF6B6B | #0D9488 | #FFF8F5 | #1a0f0f |

Mode is set contextually: `discovery` on LandmarkDetail, `expedition` on expedition screens, `quest` on quest screens, default `exploration`.

---

## 14. Figure Placeholders

*Paste each code block into Eraser (eraser.io) or render with Mermaid.*

---

### Figure 1 — System Architecture

**[FIGURE 1: Cloud Architecture Diagram — paste into eraser.io → Cloud Architecture]**

```
cloud-architecture-diagram

groups {
  MobileApp [label: "Mobile App (Expo / React Native)", color: "#F5A623"]
  SupabaseCloud [label: "Supabase Cloud", color: "#3ECF8E"]
  ExternalAPIs [label: "External APIs", color: "#4A90D9"]
}

MobileApp.ReactNativeUI [label: "React Native UI\n15 screens, 7 components"]
MobileApp.ZustandStore [label: "Zustand Store\n+ AsyncStorage"]
MobileApp.WebViewMap [label: "TomTomMap\n(WebView)"]
MobileApp.RecoEngine [label: "Recommendation\nEngine (client-side)"]
MobileApp.RouteBuilder [label: "Route Builder\n(nearest-neighbor)"]

SupabaseCloud.PostgreSQL [label: "PostgreSQL\n7 tables"]
SupabaseCloud.GoTrue [label: "GoTrue Auth\nJWT + sessions"]
SupabaseCloud.Realtime [label: "Realtime\n(PostgreSQL CDC)"]
SupabaseCloud.Storage [label: "AsyncStorage\n(JWT persistence)"]

ExternalAPIs.TomTomSearch [label: "TomTom Search v2\nPOI discovery"]
ExternalAPIs.TomTomMaps [label: "TomTom Maps SDK\n6.25 (WebView)"]
ExternalAPIs.OpenWeather [label: "OpenWeatherMap\nCurrent conditions"]
ExternalAPIs.ExpoBattery [label: "expo-battery\nDevice state"]

MobileApp.ReactNativeUI --> MobileApp.ZustandStore [label: "read state"]
MobileApp.ZustandStore --> SupabaseCloud.PostgreSQL [label: "sync on login / check-in"]
MobileApp.ZustandStore --> SupabaseCloud.GoTrue [label: "auth operations"]
MobileApp.ZustandStore --> SupabaseCloud.Storage [label: "persist JWT"]
MobileApp.ReactNativeUI --> MobileApp.WebViewMap [label: "props: landmarks, expeditions"]
MobileApp.WebViewMap --> ExternalAPIs.TomTomMaps [label: "CDN map tiles & SDK"]
MobileApp.RecoEngine --> MobileApp.ZustandStore [label: "reads interests, collection"]
MobileApp.RouteBuilder --> ExternalAPIs.TomTomSearch [label: "POI search (optional)"]
MobileApp.RouteBuilder --> MobileApp.RecoEngine [label: "score pool"]
SupabaseCloud.PostgreSQL --> SupabaseCloud.Realtime [label: "CDC on messages table"]
SupabaseCloud.Realtime --> MobileApp.ReactNativeUI [label: "WebSocket push\n(chat messages)"]
MobileApp.ReactNativeUI --> ExternalAPIs.OpenWeather [label: "current weather"]
MobileApp.ReactNativeUI --> ExternalAPIs.ExpoBattery [label: "battery level / state"]
```

---

### Figure 2 — Database Entity-Relationship Diagram

**[FIGURE 2: ER Diagram — paste into eraser.io → Entity Relationship]**

```
entity-relationship-diagram

auth_users [label: "auth.users"] {
  id [type: "UUID", pk: true]
  email [type: "VARCHAR"]
  user_metadata [type: "JSONB"]
}

user_profiles {
  id [type: "UUID", pk: true, fk: "auth_users.id"]
  display_name [type: "VARCHAR(100)"]
  interests [type: "TEXT[]"]
  visitor_type [type: "TEXT"]
  updated_at [type: "TIMESTAMPTZ"]
}

landmarks {
  id [type: "UUID", pk: true]
  name [type: "VARCHAR(255)"]
  latitude [type: "DECIMAL(10,8)"]
  longitude [type: "DECIMAL(11,8)"]
  category [type: "TEXT"]
  tier [type: "TEXT"]
  is_indoor [type: "BOOLEAN"]
  points [type: "INT"]
  avg_visit_duration_min [type: "INT"]
}

collections {
  id [type: "UUID", pk: true]
  user_id [type: "UUID", fk: "auth_users.id"]
  landmark_id [type: "UUID", fk: "landmarks.id", nullable: true]
  landmark_name [type: "TEXT"]
  landmark_category [type: "TEXT"]
  landmark_tier [type: "TEXT"]
  xp_earned [type: "INT"]
  dwell_time_min [type: "INT"]
  visited_at [type: "TIMESTAMPTZ"]
}

expeditions {
  id [type: "UUID", pk: true]
  created_by [type: "UUID", fk: "auth_users.id"]
  creator_name [type: "TEXT"]
  landmark_lat [type: "DECIMAL(10,8)"]
  landmark_lon [type: "DECIMAL(11,8)"]
  categories [type: "TEXT[]"]
  group_size [type: "INT"]
  status [type: "TEXT"]
  created_at [type: "TIMESTAMPTZ"]
}

expedition_members {
  id [type: "UUID", pk: true]
  expedition_id [type: "UUID", fk: "expeditions.id"]
  user_id [type: "UUID", fk: "auth_users.id"]
  user_name [type: "TEXT"]
  joined_at [type: "TIMESTAMPTZ"]
}

messages {
  id [type: "UUID", pk: true]
  expedition_id [type: "UUID", fk: "expeditions.id", nullable: true]
  dm_peer_id [type: "UUID", fk: "auth_users.id", nullable: true]
  sender_id [type: "UUID", fk: "auth_users.id"]
  content [type: "TEXT"]
  type [type: "TEXT"]
  metadata [type: "JSONB"]
}

auth_users ||--|| user_profiles : "has profile"
auth_users ||--o{ collections : "checks in"
auth_users ||--o{ expeditions : "creates"
auth_users ||--o{ expedition_members : "joins"
auth_users ||--o{ messages : "sends"
landmarks  ||--o{ collections : "collected in"
expeditions ||--o{ expedition_members : "has"
expeditions ||--o{ messages : "has chat"
```

---

### Figure 3 — Navigation Flow

**[FIGURE 3: Navigation Flow — paste into eraser.io → Flowchart]**

```
flowchart-elk

AppBoot [label: "App Boot", shape: oval]
Hydrate [label: "useStore.hydrate()\n+ getSession()"]
AuthCheck [label: "isAuthenticated?", shape: diamond]
OnboardCheck [label: "hasOnboarded?", shape: diamond]
Login [label: "LoginScreen"]
Signup [label: "SignupScreen"]
Onboarding [label: "OnboardingScreen"]
Main [label: "TabNavigator\n(MapScreen default)"]
MapScreen [label: "MapScreen"]
NearbyScreen [label: "NearbyScreen\n(modal)"]
LandmarkDetail [label: "LandmarkDetailScreen\n(modal)"]
CreateExpedition [label: "CreateExpeditionScreen\n(modal)"]
ExpeditionPreview [label: "ExpeditionPreviewScreen\n(modal)"]
ExpeditionChat [label: "ExpeditionChatScreen"]
MyExpeditions [label: "MyExpeditionsScreen"]
QuestsScreen [label: "QuestsScreen"]
RouteBuilder [label: "RouteBuilderScreen"]
Collection [label: "CollectionScreen"]
Profile [label: "ProfileScreen"]

AppBoot --> Hydrate
Hydrate --> AuthCheck
AuthCheck -- No --> Login
AuthCheck -- Yes --> OnboardCheck
OnboardCheck -- No --> Onboarding
OnboardCheck -- Yes --> Main
Login -- "tap sign up" --> Signup
Login -- "success" --> OnboardCheck
Signup -- "success" --> Onboarding
Onboarding -- "complete" --> Main
Main --> MapScreen
Main --> QuestsScreen
Main --> RouteBuilder
Main --> Collection
Main --> Profile
MapScreen -- "radar FAB" --> NearbyScreen
MapScreen -- "marker tap" --> LandmarkDetail
MapScreen -- "+ FAB → expedition" --> CreateExpedition
MapScreen -- "expedition pin tap" --> ExpeditionPreview
MapScreen -- "+ FAB → my expeditions" --> MyExpeditions
ExpeditionPreview -- "join / continue" --> ExpeditionChat
CreateExpedition -- "launch" --> ExpeditionChat
NearbyScreen -- "landmark tap" --> LandmarkDetail
```

---

### Figure 4 — Recommendation Engine Data Flow

**[FIGURE 4: Recommendation Engine — paste into eraser.io → Flowchart]**

```
flowchart-elk

UserAction [label: "User opens NearbyScreen\nor Route Builder", shape: oval]
FetchLandmarks [label: "fetchAllLandmarks(lat, lon)\nDB SELECT landmarks"]
Filter [label: "Filter by radius\n+ selected categories"]
BuildPrefs [label: "buildPreferences()\ninterests → preferred_categories\ncollection → category_counts\ncollection → collected_ids"]
BuildContext [label: "buildContext()\nhour → timeOfDay\nweather hook\nbattery hook"]
Score [label: "calculateScore(landmark, prefs, ctx)\nBase = 50\n+ interest match (+20)\n+ tier bonus\n+ novelty (+12/+5)\n− collected (−60)\n+ weather signals\n+ time-of-day signals\n+ battery signals"]
Clamp [label: "clamp(score, 0, 100)"]
Sort [label: "sort descending by score"]
SortMode [label: "Sort mode?", shape: diamond]
ForYou [label: "Return top-scored list\n+ Top Pick ribbon on #1"]
Nearest [label: "Sort by distance only"]
Rare [label: "Sort: Hidden→Discovered→Public\nthen by score within tier"]
TierGate [label: "getUnlockedTiers()\nHide locked tiers visually"]
Display [label: "NearbyScreen card list", shape: oval]

UserAction --> FetchLandmarks
FetchLandmarks --> Filter
Filter --> BuildPrefs
Filter --> BuildContext
BuildPrefs --> Score
BuildContext --> Score
Score --> Clamp
Clamp --> Sort
Sort --> SortMode
SortMode -- "For You" --> ForYou
SortMode -- "Nearest" --> Nearest
SortMode -- "Rare" --> Rare
ForYou --> TierGate
Nearest --> TierGate
Rare --> TierGate
TierGate --> Display
```

---

### Figure 5 — Expedition Lifecycle Sequence

**[FIGURE 5: Sequence Diagram — paste into eraser.io → Sequence]**

```
sequence

participants {
  Creator [label: "Creator (Alice)"]
  OtherUser [label: "Other User (Marco)"]
  App [label: "React Native App"]
  Supabase [label: "Supabase DB"]
  Realtime [label: "Supabase Realtime"]
}

Creator -> App: Fill CreateExpeditionScreen
App -> Supabase: INSERT expeditions (status=active)
Supabase -> App: expedition row
App -> Supabase: INSERT expedition_members (creator)
App -> Creator: Navigate to ExpeditionChatScreen

App -> Realtime: subscribe channel expedition_messages:<id>

OtherUser -> App: Open MapScreen (useFocusEffect)
App -> Supabase: autoExpireExpeditions() (fire-and-forget)
App -> Supabase: SELECT expeditions WHERE status=active
Supabase -> App: expedition rows (with members)
App -> OtherUser: Pulsing pin on map

OtherUser -> App: Tap expedition pin
App -> Supabase: SELECT expedition_members WHERE expedition_id
Supabase -> App: member list
App -> OtherUser: ExpeditionPreviewScreen (Join button)

OtherUser -> App: Tap "Join Expedition"
App -> Supabase: UPSERT expedition_members (OtherUser)
App -> OtherUser: Navigate to ExpeditionChatScreen
App -> Realtime: subscribe channel expedition_messages:<id>

Creator -> App: Send message
App -> Supabase: INSERT messages
Supabase -> Realtime: CDC broadcast (REPLICA IDENTITY FULL)
Realtime -> App: INSERT payload
App -> OtherUser: onMessage() → render bubble

Creator -> App: Tap End (⋮ menu)
App -> Supabase: UPDATE expeditions SET status=ended
App -> Creator: Navigate to MapScreen
```

---

### Figure 6 — State Sync Flow

**[FIGURE 6: State Sync — paste into eraser.io → Flowchart]**

```
flowchart-elk

AppBoot [label: "App Boot", shape: oval]
HydrateLocal [label: "hydrate()\nAsyncStorage.getItem('@explorify_v1')\n→ set Zustand state"]
GetSession [label: "supabase.auth.getSession()\nRestore JWT from AsyncStorage"]
SessionValid [label: "JWT valid?", shape: diamond]
SetAuthUser [label: "setAuthUser({ id, email, name })"]
SyncFromSupabase [label: "syncFromSupabase()\n→ fetchCollections(userId)\n→ fetchUserProfile(userId)"]
MergeState [label: "Merge server state\nif serverCollection.length >\nlocal collection length"]
PersistMerged [label: "_persist()\nAsyncStorage.setItem(merged state)"]
UserAction [label: "User checks in / completes quest / etc.", shape: oval]
LocalUpdate [label: "set() → in-memory Zustand"]
PersistLocal [label: "_persist() → AsyncStorage"]
SupabaseSave [label: "saveCheckIn / saveUserProfile\n→ Supabase DB"]
ThemeMode [label: "setMode()\nno AsyncStorage write\ntheme is ephemeral"]

AppBoot --> HydrateLocal
AppBoot --> GetSession
GetSession --> SessionValid
SessionValid -- Yes --> SetAuthUser
SetAuthUser --> SyncFromSupabase
SyncFromSupabase --> MergeState
MergeState --> PersistMerged
SessionValid -- No --> HydrateLocal
HydrateLocal --> UserAction
UserAction --> LocalUpdate
LocalUpdate --> PersistLocal
LocalUpdate --> SupabaseSave
UserAction --> ThemeMode
```

---

### Figure 7 — WebView Map Reload Guard

**[FIGURE 7: WebView Reload Guard — paste into eraser.io → Flowchart]**

```
flowchart-elk

FocusEvent [label: "Screen Focus\n(useFocusEffect)", shape: oval]
LoadNearby [label: "loadNearby()\nuseCallback deps: []"]
GetLocation [label: "getCurrentLocation()"]
FetchData [label: "Promise.all([\n  fetchAllLandmarks,\n  fetchActiveExpeditions\n])"]
GetStoreState [label: "useStore.getState()\nRead { interests, visitorType, collection }\nat call time (not via closure)"]
DNAMatch [label: "Compute dnaMatch\nper expedition"]
BatchSetState [label: "React 18 batches:\nsetLandmarks(results)\nsetExpeditions(withMatch)\n→ single render"]
MemoCheck [label: "useMemo deps changed?\nJSON.stringify(landmarks)\nJSON.stringify(expeditions)", shape: diamond]
RebuildHTML [label: "buildHTML()\nRebuild full HTML string"]
WebViewReload [label: "WebView loads new source\n(one reload only)"]
NoReload [label: "WebView unchanged\n(skips reload)"]
CollectionUpdate [label: "Store update\n(check-in, sync)", shape: oval]
ReRender [label: "MapScreen re-renders\n(loadNearby still stable)"]

FocusEvent --> LoadNearby
LoadNearby --> GetLocation
GetLocation --> FetchData
FetchData --> GetStoreState
GetStoreState --> DNAMatch
DNAMatch --> BatchSetState
BatchSetState --> MemoCheck
MemoCheck -- Yes --> RebuildHTML
RebuildHTML --> WebViewReload
MemoCheck -- No --> NoReload
CollectionUpdate --> ReRender
ReRender --> MemoCheck
```

---

## 15. Visualisation Scripts

*Run these locally with Python 3.9+. Install: `pip install matplotlib numpy pandas seaborn`*

---

### Script 1 — Recommendation Score Distribution

Shows how each signal shifts the base score of 50.

```python
# viz_01_score_distribution.py
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

signals = [
    ("Base", 50, "#9CA3AF"),
    ("Interest match", 20, "#F5A623"),
    ("Local + hidden", 15, "#3D2B8E"),
    ("Local + discovered", 8, "#3D2B8E"),
    ("Tourist + public", 8, "#4A90D9"),
    ("Tourist points max", 10, "#4A90D9"),
    ("Novelty (fresh cat)", 12, "#22c55e"),
    ("Novelty (lightly explored)", 5, "#22c55e"),
    ("Already collected", -60, "#DC2626"),
    ("Accessibility bonus", 5, "#6B7280"),
    ("Rain + indoor", 18, "#1D4ED8"),
    ("Rain + outdoor", -15, "#DC2626"),
    ("Clear + outdoor", 6, "#F59E0B"),
    ("Evening + Nightlife", 18, "#7C3AED"),
    ("Evening + Art", 10, "#EC4899"),
    ("Morning + Food", 10, "#F97316"),
    ("Afternoon + History", 8, "#D97706"),
    ("Night + Nightlife", 14, "#7C3AED"),
    ("Battery low + short visit", 12, "#10B981"),
    ("Battery low + long visit", -8, "#DC2626"),
]

labels = [s[0] for s in signals]
values = [s[1] for s in signals]
colors = [s[2] for s in signals]

fig, ax = plt.subplots(figsize=(12, 7))
bars = ax.barh(labels, values, color=colors, edgecolor='white', linewidth=0.5)
ax.axvline(0, color='black', linewidth=0.8)
ax.axvline(50, color='#F5A623', linewidth=1.5, linestyle='--', label='Base score (50)')
ax.set_xlabel("Score Δ", fontsize=12)
ax.set_title("Explorify Recommendation Engine — Signal Breakdown", fontsize=14, fontweight='bold')
ax.legend()
ax.set_xlim(-70, 75)

for bar, val in zip(bars, values):
    ax.text(
        val + (1 if val >= 0 else -1),
        bar.get_y() + bar.get_height() / 2,
        f"{val:+d}", va='center', ha='left' if val >= 0 else 'right', fontsize=9
    )

plt.tight_layout()
plt.savefig("viz_01_score_distribution.png", dpi=150, bbox_inches='tight')
plt.show()
print("Saved: viz_01_score_distribution.png")
```

---

### Script 2 — XP Progression Curve & Tier Unlocks

```python
# viz_02_xp_progression.py
import matplotlib.pyplot as plt
import numpy as np

xp_range = np.arange(0, 6001, 1)
levels = np.floor(xp_range / 500) + 1

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)

# Level curve
ax1.plot(xp_range, levels, color='#F5A623', linewidth=2.5, label='Level')
ax1.axvline(500,  color='#00C9B1', linestyle='--', linewidth=1.2, label='Discovered unlock (L2)')
ax1.axvline(2500, color='#3D2B8E', linestyle='--', linewidth=1.2, label='Hidden unlock (L6)')
ax1.fill_between(xp_range, levels, alpha=0.15, color='#F5A623')

# Mark test users
test_users = [
    ("Sophie", 150,   1, '#6B7280'),
    ("Alice",  2820,  5, '#00C9B1'),
    ("Marco",  3920,  7, '#F97316'),
    ("Dev",    5000, 11, '#7C3AED'),
]
for name, xp, level, color in test_users:
    ax1.scatter([xp], [level], color=color, s=100, zorder=5)
    ax1.annotate(f"{name}\n(L{level})", (xp, level), textcoords="offset points",
                 xytext=(0, 12), ha='center', fontsize=9, color=color, fontweight='bold')

ax1.set_ylabel("Level", fontsize=11)
ax1.set_title("XP Progression — Level, Unlocks, and Test Users", fontsize=13, fontweight='bold')
ax1.legend(loc='upper left', fontsize=9)
ax1.set_ylim(0, 14)
ax1.grid(axis='y', alpha=0.3)

# Quest target curve
targets = np.minimum(3 + np.floor(levels / 3), 8)
ax2.plot(xp_range, targets, color='#7C3AED', linewidth=2.5, label='Quest target (landmarks)')
ax2.fill_between(xp_range, targets, alpha=0.15, color='#7C3AED')
ax2.set_xlabel("Total XP", fontsize=11)
ax2.set_ylabel("Quest Target (landmarks)", fontsize=11)
ax2.set_title("Adaptive Quest Difficulty — Target Scales with Level", fontsize=12)
ax2.legend(fontsize=9)
ax2.set_ylim(2, 9.5)
ax2.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig("viz_02_xp_progression.png", dpi=150, bbox_inches='tight')
plt.show()
print("Saved: viz_02_xp_progression.png")
```

---

### Script 3 — Category Affinity Decay (Recency Weighting)

```python
# viz_03_affinity_decay.py
import matplotlib.pyplot as plt
import numpy as np

days = np.linspace(0, 120, 500)
half_life = 45
decay = np.exp(-days / half_life)

fig, ax = plt.subplots(figsize=(10, 5))

ax.plot(days, decay, color='#F5A623', linewidth=2.5, label=f'w = e^(−days / {half_life})')
ax.axhline(0.5, color='#DC2626', linestyle='--', linewidth=1.2, label='Half-life (w=0.5, day 45)')
ax.axhline(0.1, color='#6B7280', linestyle=':', linewidth=1.2, label='Near-zero weight (w=0.1)')

# Annotate specific days
for d, label in [(1, '1 day\n(w≈0.978)'), (7, '1 week\n(w≈0.857)'),
                 (30, '30 days\n(w≈0.513)'), (45, '45 days\n(w=0.5)'),
                 (90, '90 days\n(w≈0.135)')]:
    w = np.exp(-d / half_life)
    ax.scatter([d], [w], s=80, zorder=5, color='#3D2B8E')
    ax.annotate(label, (d, w), textcoords="offset points", xytext=(8, 5),
                fontsize=8.5, color='#3D2B8E')

ax.fill_between(days, decay, alpha=0.1, color='#F5A623')
ax.set_xlabel("Days since check-in", fontsize=11)
ax.set_ylabel("Affinity weight", fontsize=11)
ax.set_title("Recency Affinity Decay — Exponential Half-life = 45 Days", fontsize=13, fontweight='bold')
ax.legend(fontsize=9)
ax.set_ylim(0, 1.05)
ax.grid(alpha=0.3)

plt.tight_layout()
plt.savefig("viz_03_affinity_decay.png", dpi=150, bbox_inches='tight')
plt.show()
print("Saved: viz_03_affinity_decay.png")
```

---

### Script 4 — DNA Match Score Distribution (Expedition Matching)

```python
# viz_04_dna_match.py
import matplotlib.pyplot as plt
import numpy as np

# Simulate DNA match for various overlap scenarios
scenarios = {
    "0 / 2 categories match\n(no overlap)": (0, 2),
    "1 / 2 categories match\n(partial)": (1, 2),
    "2 / 2 categories match\n(full match)": (2, 2),
    "1 / 3 categories match": (1, 3),
    "2 / 3 categories match": (2, 3),
    "3 / 3 categories match\n+ explored all": (3, 3),
}
cat_xp = 40   # base per matching category
explore_bonus = 20  # well-explored bonus (≥3 visits)
base_offset = 30
floor_val = 28
ceil_val = 97

labels, scores = [], []
for label, (match, total) in scenarios.items():
    score_per_cat = match * cat_xp + match * explore_bonus  # assume all explored
    raw = round(score_per_cat / total) if total else 0
    final = max(floor_val, min(ceil_val, raw + base_offset))
    labels.append(label)
    scores.append(final)

colors = ['#DC2626' if s < 40 else '#F97316' if s < 65 else '#22c55e' for s in scores]

fig, ax = plt.subplots(figsize=(10, 5))
bars = ax.bar(range(len(labels)), scores, color=colors, edgecolor='white', linewidth=0.5)
ax.axhline(85, color='#22c55e', linestyle='--', linewidth=1.2, label='"Great fit" ≥ 85%')
ax.axhline(60, color='#F97316', linestyle='--', linewidth=1.2, label='"Good fit" ≥ 60%')
ax.axhline(floor_val, color='#6B7280', linestyle=':', linewidth=1.0, label=f'Floor ({floor_val}%)')
ax.axhline(ceil_val,  color='#3D2B8E', linestyle=':', linewidth=1.0, label=f'Ceiling ({ceil_val}%)')

for bar, val in zip(bars, scores):
    ax.text(bar.get_x() + bar.get_width() / 2, val + 1.5, f"{val}%",
            ha='center', va='bottom', fontsize=10, fontweight='bold')

ax.set_xticks(range(len(labels)))
ax.set_xticklabels(labels, fontsize=8.5, ha='center')
ax.set_ylabel("DNA Match %", fontsize=11)
ax.set_ylim(0, 105)
ax.set_title("Expedition DNA Match Score — Category Overlap Scenarios", fontsize=13, fontweight='bold')
ax.legend(fontsize=9)
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig("viz_04_dna_match.png", dpi=150, bbox_inches='tight')
plt.show()
print("Saved: viz_04_dna_match.png")
```

---

### Script 5 — Battery Tier Thresholds & Route Cap

```python
# viz_05_battery_tiers.py
import matplotlib.pyplot as plt
import numpy as np

battery_levels = np.linspace(0, 1, 500)
route_cap = np.where(battery_levels < 0.10, 30,
            np.where(battery_levels < 0.20, 60, 180))

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))

# Left: tier zones
colors_bg = ['#FEE2E2', '#FEF3C7', '#FEF9C3', '#F0FDF4']
thresholds = [0, 0.10, 0.20, 0.50, 1.0]
tier_labels = ['Critical\n(< 10%)', 'Low\n(10–20%)', 'Medium\n(20–50%)', 'OK\n(≥ 50%)']
tier_colors = ['#DC2626', '#D97706', '#CA8A04', '#16A34A']

for i in range(4):
    ax1.axhspan(thresholds[i], thresholds[i+1], alpha=0.2, color=tier_colors[i], label=tier_labels[i])
    ax1.text(0.5, (thresholds[i] + thresholds[i+1]) / 2, tier_labels[i],
             ha='center', va='center', fontsize=11, fontweight='bold', color=tier_colors[i])

ax1.set_xlim(0, 1)
ax1.set_ylim(0, 1)
ax1.set_xlabel("Battery Level (0–1)", fontsize=11)
ax1.set_ylabel("Battery Level", fontsize=11)
ax1.set_title("Battery Tier Zones", fontsize=12, fontweight='bold')
ax1.set_xticks([0, 0.10, 0.20, 0.50, 1.0])
ax1.set_xticklabels(['0%', '10%', '20%', '50%', '100%'])

# Right: route cap
ax2.plot(battery_levels * 100, route_cap, color='#F5A623', linewidth=2.5)
ax2.fill_between(battery_levels * 100, route_cap, alpha=0.15, color='#F5A623')
ax2.axvline(10, color='#DC2626', linestyle='--', linewidth=1.2, label='Critical threshold')
ax2.axvline(20, color='#D97706', linestyle='--', linewidth=1.2, label='Low threshold')
ax2.axvline(50, color='#16A34A', linestyle='--', linewidth=1.2, label='OK threshold')
ax2.set_xlabel("Battery Level (%)", fontsize=11)
ax2.set_ylabel("Max Route Duration (min)", fontsize=11)
ax2.set_title("Route Duration Cap by Battery Level", fontsize=12, fontweight='bold')
ax2.set_ylim(0, 200)
ax2.set_yticks([30, 60, 90, 120, 150, 180])
ax2.legend(fontsize=9)
ax2.grid(alpha=0.3)

plt.suptitle("Explorify — Battery-Aware Adaptive Routing", fontsize=13, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig("viz_05_battery_tiers.png", dpi=150, bbox_inches='tight')
plt.show()
print("Saved: viz_05_battery_tiers.png")
```

---

### Script 6 — Time-of-Day Score Bonuses Heatmap

```python
# viz_06_timeofday_heatmap.py
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns

categories = ['Architecture', 'Food', 'History', 'Art', 'Nature', 'Nightlife']
times = ['Morning\n(06–12)', 'Afternoon\n(12–17)', 'Evening\n(17–21)', 'Night\n(21–06)']

# Bonuses from calculateScore
bonuses = np.array([
    [0,  0,  0,  0],   # Architecture: +8 afternoon
    [10, 0,  8,  0],   # Food: +10 morning, +8 evening
    [0,  8,  0,  0],   # History: +8 afternoon
    [0,  6, 10,  0],   # Art: +6 afternoon, +10 evening
    [8,  0,  0,  0],   # Nature: +8 morning
    [0,  0, 18, 14],   # Nightlife: +18 evening, +14 night
])

# Fix Architecture column (manually add +8 afternoon)
bonuses[0][1] = 8

fig, ax = plt.subplots(figsize=(9, 6))
sns.heatmap(bonuses, annot=True, fmt='d', cmap='YlOrRd',
            xticklabels=times, yticklabels=categories,
            linewidths=0.5, linecolor='white',
            ax=ax, cbar_kws={'label': 'Score bonus'})
ax.set_title("Recommendation Engine — Time-of-Day Score Bonuses by Category",
             fontsize=13, fontweight='bold', pad=12)
ax.set_xlabel("Time of Day", fontsize=11)
ax.set_ylabel("Landmark Category", fontsize=11)

plt.tight_layout()
plt.savefig("viz_06_timeofday_heatmap.png", dpi=150, bbox_inches='tight')
plt.show()
print("Saved: viz_06_timeofday_heatmap.png")
```

---

### Script 7 — Expedition Discovery Radius Visualisation

```python
# viz_07_expedition_radius.py
import matplotlib.pyplot as plt
import numpy as np

# Dublin city centre coordinates (approximate)
CITY_LAT, CITY_LON = 53.3498, -6.2603

# Expedition locations from the DB
expeditions = [
    ("Alice (test)",         53.2937, -6.1326, '#00C9B1'),
    ("Marco (test)",         53.2937, -6.1326, '#F97316'),
    ("After Dark",           53.3452, -6.2644, '#FF6B6B'),
    ("Georgian Dublin",      53.3391, -6.2484, '#7C3AED'),
    ("Street Food Safari",   53.3452, -6.2644, '#22c55e'),
    ("Garden",               53.3377, -6.2591, '#F5A623'),
]

fig, ax = plt.subplots(figsize=(9, 9))

# Old 2km circle
circle_old = plt.Circle((CITY_LON, CITY_LAT), 0.018, fill=False,
                          color='#DC2626', linewidth=1.5, linestyle='--', label='Old radius: 2km (BROKEN)')
# New 10km circle (approx)
circle_new = plt.Circle((CITY_LON, CITY_LAT), 0.09,  fill=False,
                          color='#22c55e', linewidth=2.0, linestyle='-',  label='New radius: 10km (FIXED)')
ax.add_patch(circle_old)
ax.add_patch(circle_new)

# User location
ax.scatter([CITY_LON], [CITY_LAT], s=200, color='#4A90D9', zorder=10, label='User (TCD fallback)')
ax.annotate("User\n(TCD)", (CITY_LON, CITY_LAT), textcoords="offset points",
            xytext=(6, 6), fontsize=9, color='#4A90D9', fontweight='bold')

# Plot expeditions
for name, lat, lon, color in expeditions:
    ax.scatter([lon], [lat], s=100, color=color, zorder=8, marker='*')
    ax.annotate(name, (lon, lat), textcoords="offset points",
                xytext=(6, 4), fontsize=8, color=color, fontweight='bold')

ax.set_xlim(-6.45, -6.05)
ax.set_ylim(53.22, 53.48)
ax.set_xlabel("Longitude", fontsize=11)
ax.set_ylabel("Latitude", fontsize=11)
ax.set_title("Expedition Discovery Radius — 2km vs 10km\n(Dublin city, approximate scale)",
             fontsize=12, fontweight='bold')
ax.legend(fontsize=9)
ax.set_aspect('equal')
ax.grid(alpha=0.2)

plt.tight_layout()
plt.savefig("viz_07_expedition_radius.png", dpi=150, bbox_inches='tight')
plt.show()
print("Saved: viz_07_expedition_radius.png")
```

---

### Script 8 — Screen Data Dependency Map

```python
# viz_08_screen_dependencies.py
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import networkx as nx

G = nx.DiGraph()

screens = ['MapScreen', 'NearbyScreen', 'RouteBuilder', 'QuestsScreen',
           'CollectionScreen', 'ProfileScreen', 'LandmarkDetail',
           'ExpeditionPreview', 'ExpeditionChat', 'MyExpeditions']
services = ['supabase.js', 'tomtom.js', 'weather.js', 'location.js']
store = ['Zustand Store']
hooks = ['useBattery', 'useWeather', 'useLocation']

G.add_nodes_from(screens,    node_type='screen')
G.add_nodes_from(services,   node_type='service')
G.add_nodes_from(store,      node_type='store')
G.add_nodes_from(hooks,      node_type='hook')

# Screen → service edges
edges = [
    ('MapScreen',       'supabase.js'),
    ('MapScreen',       'location.js'),
    ('MapScreen',       'Zustand Store'),
    ('NearbyScreen',    'supabase.js'),
    ('NearbyScreen',    'Zustand Store'),
    ('RouteBuilder',    'supabase.js'),
    ('RouteBuilder',    'useBattery'),
    ('RouteBuilder',    'useWeather'),
    ('RouteBuilder',    'useLocation'),
    ('RouteBuilder',    'Zustand Store'),
    ('QuestsScreen',    'Zustand Store'),
    ('CollectionScreen','Zustand Store'),
    ('ProfileScreen',   'Zustand Store'),
    ('LandmarkDetail',  'supabase.js'),
    ('LandmarkDetail',  'location.js'),
    ('LandmarkDetail',  'Zustand Store'),
    ('ExpeditionPreview','supabase.js'),
    ('ExpeditionPreview','Zustand Store'),
    ('ExpeditionChat',  'supabase.js'),
    ('ExpeditionChat',  'Zustand Store'),
    ('MyExpeditions',   'supabase.js'),
    ('MyExpeditions',   'Zustand Store'),
    # Hooks → services
    ('useWeather',      'weather.js'),
    ('useLocation',     'location.js'),
    ('useBattery',      'None'),
    # Services → Supabase
    ('supabase.js',     'Supabase DB'),
    ('tomtom.js',       'TomTom API'),
    ('weather.js',      'OpenWeather API'),
    ('location.js',     'Expo Location'),
]

external = ['Supabase DB', 'TomTom API', 'OpenWeather API', 'Expo Location']
G.add_nodes_from(external, node_type='external')
G.add_edges_from(edges)
G.remove_node('None')

pos = nx.spring_layout(G, seed=42, k=2.5)

color_map = {
    'screen':   '#F5A623',
    'service':  '#4A90D9',
    'store':    '#22c55e',
    'hook':     '#EC4899',
    'external': '#6B7280',
}
node_colors = [color_map.get(G.nodes[n].get('node_type', 'external'), '#9CA3AF') for n in G.nodes]

fig, ax = plt.subplots(figsize=(16, 11))
nx.draw(G, pos, ax=ax, with_labels=True, node_color=node_colors,
        node_size=2200, font_size=7.5, font_weight='bold', font_color='white',
        edge_color='#9CA3AF', arrows=True, arrowsize=15,
        connectionstyle='arc3,rad=0.1')

legend_patches = [
    mpatches.Patch(color='#F5A623', label='Screen'),
    mpatches.Patch(color='#4A90D9', label='Service'),
    mpatches.Patch(color='#22c55e', label='Zustand Store'),
    mpatches.Patch(color='#EC4899', label='Hook'),
    mpatches.Patch(color='#6B7280', label='External API'),
]
ax.legend(handles=legend_patches, loc='upper left', fontsize=9)
ax.set_title("Explorify — Screen to Service Dependency Graph", fontsize=14, fontweight='bold')

plt.tight_layout()
plt.savefig("viz_08_screen_dependencies.png", dpi=150, bbox_inches='tight')
plt.show()
print("Saved: viz_08_screen_dependencies.png")
```

---

### Running All Scripts

```bash
# Install dependencies
pip install matplotlib numpy seaborn networkx pandas

# Run all at once
python viz_01_score_distribution.py
python viz_02_xp_progression.py
python viz_03_affinity_decay.py
python viz_04_dna_match.py
python viz_05_battery_tiers.py
python viz_06_timeofday_heatmap.py
python viz_07_expedition_radius.py
python viz_08_screen_dependencies.py

# Output: 8 PNG files ready for import into your report
```

---

## 16. Unified Branch — v2 Feature Set

This section documents all additions and architectural changes introduced in `feature/unified`, which merges `feature/refactor` (stable DB + mobile) with `feature/refactor-new` (new backend services and screens).

---

### 16.1 Branch Merge Strategy

Two branches were merged into `feature/unified`:

| Branch | Role |
|--------|------|
| `feature/refactor` | Stable base — correct Supabase connection, working mobile |
| `feature/refactor-new` | New features — LLM services, communities, channels, quests, new screens |

**Conflict resolution rules:**

| File | Resolution |
|------|------------|
| `backend/src/config/database.js` | Keep `feature/refactor` — correct pool (20), correct SSL |
| `database/schema.sql` | Keep `feature/refactor` — new objects live in migration 011 |
| `mobile/src/services/api.js` | Keep `feature/refactor` — no phantom URL changes |
| All other conflicts | Take `feature/refactor-new` |

The `feature/refactor-new` branch had been developed against a **separate Supabase project** (different DATABASE_URL) and its `schema.sql` started with `DROP TABLE … CASCADE`. Rather than running those destructive migrations, all new DB objects were expressed as a single additive migration: `database/migrations/011_unified_features.sql`.

---

### 16.2 Local-First Architecture (API Elimination)

`feature/refactor-new` contained screens and store actions that called a REST backend at `EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'`. Since that backend is optional and `localhost` is unreachable from a physical device, all 6 phantom API call sites were replaced with direct Supabase calls or on-device computation:

| Old call | Replacement |
|----------|-------------|
| `api.post('/profile/daily-challenge')` | Deterministic day-of-year seed using user interests |
| `api.get('/quests')` | Local computation: map `QUESTS` array, count `collection` entries per category |
| `api.post('/quests/${id}/claim')` | Local XP award via `getQuestXP()` / `getQuestTarget()` |
| `api.post('/profile/drift-check')` | Removed (fire-and-forget in `syncFromSupabase`, now silent no-op) |
| `api.post('/routes/generate')` | On-device greedy algorithm (see §10) |
| `api.get('/communities/${id}')` | `fetchCommunityChannels()` from `supabase.js` |
| `api.get('/landmarks/context')` | Removed; context computed locally from `new Date().getHours()` |
| `api.post('/landmarks/describe')` | Silent no-op; AI description shown only when backend is running |
| `api.get('/landmarks')` in `useLandmarks` hook | `fetchAllLandmarks()` from `supabase.js` |
| `weather.js` — `api.get('/landmarks/context')` | Direct OpenWeatherMap REST call; neutral stub when key absent |

`fetchRefinement` (ProfileScreen "Refine My Taste") still uses a dynamic `api.js` import inside a try/catch — it silently no-ops when the backend is unavailable, and functions when `backend/` is running with `GROQ_API_KEY`.

---

### 16.3 New Backend Services

All services live in `backend/src/services/`.

#### `llmService.js` — Groq LLM Integration

Uses **Groq API** (`llama-3.1-8b-instant` or similar) for three features:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `getPersonalisedDescription(landmarkId, userProfile)` | `POST /landmarks/describe` | Generates a personalised landmark description tailored to visitor type, interests, language |
| `getConversationalRefinement(userId, recentVisits)` | `POST /profile/refinement` | Returns a conversational "insight" message about the user's taste evolution |
| `getDriftNarrative(userId, driftInfo)` | Internal (drift detection) | Generates a narrative explaining detected interest drift |

**Lazy initialisation pattern** — the Groq client is created on first use, not at module load time. This prevents server crash when `GROQ_API_KEY` is missing:

```js
let _groq = null;
function getGroq() {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set.');
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}
```

#### `driftDetectionService.js`

Detects when a user's category preferences have shifted significantly from their baseline interests.

```
Input: userId, recentVisits (last N check-ins)
Compute: frequency distribution of categories in recent visits
Compare: against user's declared interests[] from user_profiles
If dominant recent category ∉ interests AND visit count ≥ threshold:
  → mark drift_detected_at, drift_from_category, drift_to_category in users table
  → trigger LLM narrative (optional)
```

#### `communityService.js`

CRUD for communities and membership management. Wraps the `communities`, `community_members`, and `community_channels` tables.

#### `expeditionService.js`

Extended expedition logic beyond the basic `supabase.js` functions: narrative expedition steps, `expedition_landmarks` population, step progress tracking.

#### `questService.js`

Server-side quest evaluation (used when backend is running). Client-side equivalent is the local computation in `useStore.fetchQuests`.

---

### 16.4 New Mobile Screens

| Screen | Description |
|--------|-------------|
| `CommunityChatScreen` | Multi-channel community chat. Loads channels via `fetchCommunityChannels`, subscribes to Realtime per channel. Supports channel switching via horizontal scroll bar. |
| `CommunityScreen` | Community discovery and detail view. Lists communities from Supabase, shows member count and description. |
| `DirectChatScreen` | 1:1 direct message conversation. Uses `sendDirectMessage` / `fetchDirectMessages` / `subscribeToDMs`. |
| `DirectMessagesScreen` | DM inbox — lists all recent DM threads with unread indicators. |
| `QuestScreen` | Individual quest detail. Shows progress, narrative description, and claim button. |

---

### 16.5 New Navigation Entries

The tab navigator and stack navigator were updated with:

| Route name | Type | Entry point |
|------------|------|-------------|
| `Community` | Stack | From HomeScreen / CommunitiesTab |
| `CommunityChat` | Stack | From CommunityScreen |
| `DirectMessages` | Tab or Stack | From ProfileScreen / HomeScreen |
| `DirectChat` | Stack | From DirectMessagesScreen |
| `Quest` | Stack | From QuestsScreen |

---

### 16.6 useStore — New State and Actions

**New persisted fields:**

| Field | Type | Description |
|-------|------|-------------|
| `quests` | Quest[] | Array of quests with computed `progress_count` |
| `dailyChallenge` | object | `{ category, title, target, progress, xpBonus, emoji, achieved, claimed }` |
| `dailyClaimed` | Record\<string, boolean\> | ISO date → claimed flag |
| `questBonusXP` | number | Cumulative XP from completed quests and daily challenges |
| `completedQuests` | string[] | Quest IDs whose XP was claimed |
| `walkPaceSamples` | number[] | Recorded walking speeds (km/h) from check-in GPS delta |
| `preferences` | object | `{ visitor_type, detail_level, language_pref, walking_pace }` |
| `refinementMessage` | string\|null | Last AI insight message from backend |

**New computed getters:**

| Getter | Formula |
|--------|---------|
| `getWalkPaceKmh()` | Average of `walkPaceSamples`; fallback 4.5 km/h |
| `getWalkPaceLabel()` | 'slow' / 'moderate' / 'fast' based on km/h |
| `getActiveQuest()` | Quest matching `activeQuestId`; computes adaptive target |
| `getSuggestedQuests()` | Top 3 QUESTS by interest-match score |

**New actions:**

| Action | Behaviour |
|--------|-----------|
| `fetchQuests()` | Local: maps QUESTS constant, counts `collection` per category as `progress_count` |
| `fetchDailyChallenge()` | Local: picks category via `dayOfYear % cats.length`; sets `dailyChallenge` |
| `completeQuest(questId)` | Local: awards XP, appends to `completedQuests`, clears `activeQuestId` |
| `claimDailyChallenge()` | Local: awards 100 XP bonus, marks today in `dailyClaimed` |
| `fetchRefinement()` | Backend-optional: `POST /profile/refinement`; silent no-op on network error |
| `recordWalkSample(kmh)` | Appends to `walkPaceSamples` (capped at 20 samples, outliers > 10 km/h dropped) |

---

### 16.7 Weather Service — Direct API

`mobile/src/services/weather.js` was rewritten to call **OpenWeatherMap** directly instead of proxying through the backend:

```
GET https://api.openweathermap.org/data/2.5/weather
  ?lat=<lat>&lon=<lon>&appid=<EXPO_PUBLIC_OPENWEATHERMAP_API_KEY>&units=metric
```

When `EXPO_PUBLIC_OPENWEATHERMAP_API_KEY` is not set, a neutral stub is returned (`{ condition: 'clear', isClear: true, isWindy: false, temperature: 15 }`).

Required `.env` entry: `EXPO_PUBLIC_OPENWEATHERMAP_API_KEY=<key>` (free tier at openweathermap.org).

---

### 16.8 Community Chat — Real-Time Architecture

Community chat uses the same Supabase Realtime transport as expedition chat, but filtered by `channel_id` instead of `expedition_id`:

```
Channel name: community_channel_messages:<channelId>
Event:        postgres_changes INSERT on messages
Filter:       channel_id=eq.<channelId>
```

Channel subscription is managed in `CommunityChatScreen` via `channelSubscription` ref. When the user switches channels, the previous subscription is torn down (`unsubscribe()`) before the new one is created.

---

### 16.9 Bug Fixes Applied in Unified Branch

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Route Builder — NaN minutes | `normaliseLandmark` exposed `lat`/`lon` but RouteBuilderScreen read `lm.latitude`/`lm.longitude` (undefined) | Added `latitude`/`longitude` aliases in `normaliseLandmark`; walk times recomputed sequentially |
| Route Builder — filter shows all landmarks | `CATEGORY_MAP` only covered 7 aliases; DB values like `'food'`, `'nightlife'` fell back to `'Architecture'` | Expanded map to all 6 app categories with case-insensitive lookup |
| MapScreen — expedition FAB floating mid-air | FAB `bottom` set to `FAB_BOTTOM + 80 = 162px` | Changed to `FAB_BOTTOM = 82px` (same level as radar FAB) |
| NearbyScreen — JSX crash | Stray extra `</View>` at line 385 re-introduced by merge | Removed extra tag |
| LandmarkDetailScreen — `haversineDistance is not a function` | Imported from `../services/location` (not present there) instead of `../services/tomtom` | Fixed import path |
| LandmarkDetailScreen — `ActivityIndicator` undefined | Missing from React Native destructured import | Added to import block |
| Backend crash on start — `GROQ_API_KEY missing` | Groq client instantiated at module load time | Lazy `getGroq()` initialiser |
| `column "user_id" does not exist` (migration 011) | `quests` table pre-existed from `007_gamification_schema` without `user_id`; `CREATE TABLE IF NOT EXISTS` was a no-op; RLS policy then failed | DO $ block checks and drops old `quests` schema before recreating |

---

### 16.10 Environment Variables Summary

| Variable | File | Required for |
|----------|------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | `mobile/.env` | All Supabase operations |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `mobile/.env` | All Supabase operations |
| `EXPO_PUBLIC_OPENWEATHERMAP_API_KEY` | `mobile/.env` | Live weather in Route Builder / Map |
| `EXPO_PUBLIC_API_URL` | `mobile/.env` | Backend features (AI insight, landmark descriptions). Set to `http://<LAN_IP>:3000/api` when running locally |
| `GROQ_API_KEY` | `backend/.env` | LLM features (landmark describe, profile refinement, drift narrative) |
| `DATABASE_URL` | `backend/.env` | Backend DB queries (Node.js pool) |
| `SUPABASE_URL` | `backend/.env` | Backend Supabase admin client |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | Backend service-level DB operations |

---

*End of Technical Report — Explorify v2.0*
