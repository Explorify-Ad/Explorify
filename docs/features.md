# Explorify — Feature Reference & Test Guide

Complete reference of every feature implemented in the app, with a full testing playbook at the end.

---

## Table of Contents

1. [Navigation & Auth](#1-navigation--auth)
2. [Onboarding](#2-onboarding)
3. [Map Screen](#3-map-screen)
4. [Quests Screen](#4-quests-screen)
5. [Route Builder Screen](#5-route-builder-screen)
6. [Collection Screen](#6-collection-screen)
7. [Landmark Detail Screen](#7-landmark-detail-screen)
8. [Nearby Screen](#8-nearby-screen)
9. [Profile Screen](#9-profile-screen)
10. [Expeditions (Group Feature)](#10-expeditions-group-feature)
11. [Adaptive Recommendation Engine](#11-adaptive-recommendation-engine)
12. [XP & Progression System](#12-xp--progression-system)
13. [Quest System](#13-quest-system)
14. [Daily Challenge](#14-daily-challenge)
15. [State Management](#15-state-management)
16. [Services & Hooks](#16-services--hooks)
17. [Theme System](#17-theme-system)
18. [Testing Playbook](#18-testing-playbook)

---

## 1. Navigation & Auth

### Stack
- **LoginScreen** / **SignupScreen** — email + password auth via Supabase
- **OnboardingScreen** — first-run setup (interests + visitor type)
- **Main** — 5-tab bottom navigator

### Bottom Tabs
| Tab | Screen | Icon |
|-----|--------|------|
| Map | MapScreen | Map |
| Quests | QuestsScreen | Target |
| Route | RouteBuilderScreen | Route |
| Collection | CollectionScreen | Briefcase |
| Profile | ProfileScreen | User |

### Auth behaviour
- Supabase session restored on app launch via `supabase.auth.getSession()`
- `onAuthStateChange` keeps store in sync; calls `syncFromSupabase()` on sign-in
- `initialRoute` resolves to `Login → Onboarding → Main` based on auth + onboarding state
- Loading spinner shown while Zustand store hydrates from AsyncStorage

---

## 2. Onboarding

Two-step wizard on first launch.

**Step 1 — Interests**
- 6 category tiles: Architecture, Food, Nature, History, Art, Nightlife
- Multi-select; at least one required to proceed

**Step 2 — Visitor type**
- Two cards: *Visitor* (tourist) / *Local*
- Changes recommendation logic and daily challenge targets throughout the app

On completion: interests + visitor type + username saved locally (AsyncStorage) and synced to Supabase user profile.

---

## 3. Map Screen

### Map
- Interactive **TomTom WebView** map centred on user location (fallback: Dublin city centre)
- Landmark pins rendered as tappable 3D markers with category colour coding
- Active expedition member dots shown as animated pulsing coral pins
- Tap vs pan disambiguated — `touchmove` > 8px sets a moved flag; `touchend` ignores taps if moved

### HUD & Overlays
- **TopHUD** — persistent status strip
- **Battery warning banner** — shows when battery is low/critical; communicates route cap
- **Animated quest progress strip** — displays active quest, progress, and `n of m landmarks` below the map

### Auto-refresh on Focus
`useFocusEffect` re-runs the full data fetch (landmarks + expeditions) every time the screen comes into focus. This means newly created or joined expeditions appear on the map immediately when navigating back — no app restart or manual refresh needed.

### Real-time DNA Match
On every map load, each active expedition's `dnaMatch` percentage is computed live:
- +40 pts per expedition category that is in the user's stated interests
- +20 pts for categories the user has explored ≥ 3 times; +8 pts for ≥ 1 visit
- Score is normalised per expedition length, floored at 28 %, ceiling at 97 %
- User profile values are read from the store at call time via `useStore.getState()` so the callback stays stable and never triggers unnecessary WebView reloads

### Floating Actions
- **Radar FAB** — opens Nearby sheet
- **Plus FAB** — share menu: continue expedition / start new / go to My Expeditions

### Contextual Greeting
`getContextualGreeting()` — adapts to time of day, weather, and visitor type.

---

## 4. Quests Screen

### Active Quest Card
- Category badge, quest title, animated progress bar, `n of m landmarks found`
- Thumbnail slots, XP pill, estimated time pill
- Switches to "Quest Complete!" state when `progress >= target`; shows Claim button

### Daily Challenge Card
- Deterministic day-seeded category (same for all users with identical interests on the same day)
- Target: 1 check-in (tourist) or 2 check-ins every other day (local)
- Claim button when achieved; green ✓ after claimed

### Suggested Quests (horizontal scroll)
- 3 cards, sorted by stated interests (tourist) or least-explored category (local)

### Explorer Type Card
- Derived from most-visited category in collection
- Falls back to onboarding interests if collection is empty

---

## 5. Route Builder Screen

### Time Budget
- Preset chips: **30 min · 1 hr · 1.5 hr · 2 hr · 3 hr**
- **Custom chip** — inline picker: Hours (0–12) + Minutes (0–55 in 5-min steps) with +/− buttons
- "Includes spots further afield" note when total > 90 min
- Each chip individually disabled only if *that duration* would be battery-capped

### Context Banners
- **Weather banner** — rainy (blue, indoor prioritised), clear (amber), windy (grey)
- **Battery banner** — shown only when battery cap reduces the selected budget

### Category Filter
- 6 chips, pre-selected from onboarding interests; at least one required

### Route Building Pipeline
1. On-demand location permission request
2. Battery cap applied via `getAdjustedBudget(timeBudget)`
3. `fetchAllLandmarks()` + `fetchUserDwellTimes()` fetched in parallel
4. Pool filtered to selected categories
5. Full recommendation engine scores pool (7 signals)
6. Personalised dwell times overlaid per category from user history
7. Nearest-neighbor algorithm builds route within time budget
8. Per-waypoint walk time computed from Haversine distance at 4.5 km/h

### Route Output
- Stats bar: stops · total min · total XP
- Waypoint cards: step number, category gradient strip, icon, name, walk time, visit time, XP
- **Open in Maps** — deep-links to Apple Maps with `saddr + daddr` waypoints

---

## 6. Collection Screen

- 3-column pin grid; each pin uses `expo-linear-gradient` with category colour
- Lucide vector icon centred on each pin
- Metallic tier ring: silver (public), gold (discovered), purple (hidden)
- Category filter bar (horizontal scroll)
- "Still out there" shimmer placeholder row
- **Pin Detail Modal** — 3D rotatable pin via `PanResponder`; shows tier, category, XP earned, date

---

## 7. Landmark Detail Screen

- 280 px gradient hero (category colour → dark navy) with watermark icon and vignette
- Stagger animation: hero fades in → sheet springs up
- **GPS proximity card** — live distance, animated gradient progress bar, pulsing ring animation when within 100 m
- Check-in button pulses when in range; `checkIn()` stores locally + syncs to Supabase
- Locked button with distance hint when out of range
- Celebration card with spring-scale animation on successful check-in

---

## 8. Nearby Screen

### Sort Modes
Three chips above the radius selector:
- **For You** — full recommendation engine score (interests + visitor type + novelty + time-of-day + collected penalty)
- **Nearest** — straight distance sort
- **Rare** — Hidden → Discovered → Public; within tier ranked by recommendation score

### Time-of-Day Banner
Dark banner below the header communicating what's hot right now:
- Morning (06:00–10:59): parks and cafés
- Lunchtime (11:00–13:59): food and culture
- Afternoon (14:00–16:59): architecture and history
- Evening (17:00–20:59): art galleries and nightlife
- Night (21:00+): hidden spots and night venues

### XP Tier Gating
Hidden landmarks are visually locked for users below **Level 6** (< 2,500 XP):
- Icon replaced with a lock symbol
- Name replaced with "Hidden Spot"
- Category replaced with "Unlock at Level 6"
- Distance bar greyed out

### Top Pick Ribbon
The highest-scored uncollected landmark in "For You" mode gets an amber "Top for you" ribbon.

### Radius Selector
200 m · 500 m · 1000 m — refetches on change.

---

## 9. Profile Screen

- Avatar circle, explorer type, level badge
- Stats grid: landmarks, quests, streak, cities
- **Exploration DNA radar** — 6-axis chart normalised to max category
- Explorer type card with personalised description
- Achievement badges — horizontal scroll; locked badges show padlock overlay
- Sign out button

---

## 10. Expeditions (Group Feature)

### Create
- Title (60-char), theme category, meeting point (landmark picker), group size (2–12), duration, DNA-only toggle
- Creates expedition in Supabase; creator auto-joins; navigates to chat

### Expedition Preview Screen
- 260 px coral→crimson→navy gradient hero; pulsing LIVE badge; category watermarks
- Animated DNA match bar (springs to real computed percentage on arrival)
- Leader card, info grid (meeting point, starts in)
- **Membership confirmed from DB** — `fetchExpeditionMembers` on mount ensures the button state is always fresh
- Join button → Join Expedition (coral) if not member; Continue Expedition (green) if already a member

### Expedition Chat Screen
- Mini live map with animated member dots
- Supabase Realtime messages (REPLICA IDENTITY FULL required on `messages` table)
- Message types: system, text, check-in shares, waypoint votes
- Optimistic insertion for instant UI feedback
- **Management menu** (⋮ button): member list, Leave action, End action (creator only)
- Both actions show Alert confirmation before executing

### My Expeditions Screen
- Dark navy gradient header with active count badge + refresh
- **Active / Past** filter tabs
- Each expedition card: gradient strip, category watermark, creator crown badge, status pill, member avatars, meeting point, Open Chat button, Leave/End danger button
- Local state update on leave/end — no re-fetch needed

### Discovery Radius
`fetchActiveExpeditions` uses a **10 km** default radius — wide enough to show all expeditions across a city. The map itself communicates distance; users decide whether a further expedition is worth the travel. Expeditions without a meeting point (no coordinates) are included regardless of distance but do not render a pin.

### Auto-Expiry
`autoExpireExpeditions()` is called silently on every `fetchActiveExpeditions`. Any expedition with `status = 'active'` and `created_at` older than 24 hours is automatically set to `ended`.

---

## 11. Adaptive Recommendation Engine

`mobile/src/utils/recommendations.js`

### `calculateScore(landmark, preferences, context)` — 0–100

| Signal | Effect |
|--------|--------|
| Interest match | +20 if landmark category matches stated interests |
| Visitor type — local | +15 hidden tier, +8 discovered tier |
| Visitor type — tourist | +8 public tier, up to +10 from landmark points |
| Category novelty | +12 never explored, +5 lightly explored (< 3 visits) |
| Already collected | −60 penalty |
| Accessibility | +5 if meets minimum level |
| Weather rain | +18 indoor, −15 outdoor |
| Weather clear | +6 outdoor |
| Weather hot/windy | +8/+5 indoor |
| Time morning | +10 Food, +8 Nature |
| Time afternoon | +8 Architecture/History, +6 Art |
| Time evening | +18 Nightlife, +10 Art, +8 Food |
| Time night | +14 Nightlife |
| Battery low/critical | +12 short visits, +8 close landmarks, −8 long visits |

### Recency-Weighted Category Affinity
`getCategoryAffinities()` in `useStore`:
- Each check-in weighted by `e^(−daysAgo / 45)` — half-life of 45 days
- Recent visits dominate; old visits fade
- Returns categories sorted by affinity score 0–100

### `buildContext({ weather, batteryTier })`
Derives `timeOfDay` (morning/afternoon/evening/night) from current hour.

### `buildPreferences({ interests, visitorType, collection })`
Builds `preferred_categories`, `visitor_type`, `category_counts`, `collected_ids` from store state.

---

## 12. XP & Progression System

| Tier | XP |
|------|----|
| Public | 150 |
| Discovered | 320 |
| Hidden | 600 |

`level = floor(totalXP / 500) + 1`

**Tier unlock thresholds:**
| Level | XP range | Unlocks |
|-------|----------|---------|
| 1 | 0–499 | Public landmarks only |
| 2 | 500–999 | Discovered landmarks |
| 6 | 2,500–2,999 | Hidden landmarks |

---

## 13. Quest System

| ID | Title | Category | Base XP | Difficulty |
|----|-------|----------|---------|------------|
| q_arch | Heritage Trail | Architecture | 600 | 3 |
| q_food | Street Food Safari | Food | 400 | 1 |
| q_history | Through the Ages | History | 550 | 2 |
| q_art | Art Discovery | Art | 500 | 2 |
| q_nature | Into the Wild | Nature | 450 | 2 |
| q_night | After Dark | Nightlife | 700 | 3 |

`target = min(3 + floor(level / 3), 8)` — grows +1 every 3 levels, caps at 8
`xp = round(baseXp × target / 3)` — scales with target

---

## 14. Daily Challenge

- Deterministic day + interests seeded category
- Target: 1 (tourist) or 2 (local, every other day)
- XP bonus: `target × 75`
- Resets at midnight via `toDateString()` key

---

## 15. State Management

`mobile/src/store/useStore.js` — Zustand + AsyncStorage

### Persisted state
`hasOnboarded`, `userName`, `interests`, `visitorType`, `collection`, `activeQuestId`, `completedQuests`, `questBonusXP`, `dailyClaimed`

### Computed getters
| Getter | Returns |
|--------|---------|
| `getTotalXP()` | Sum of collection XP + quest bonus XP |
| `getLevel()` | `floor(totalXP / 500) + 1` |
| `getStreak()` | Consecutive days with check-ins |
| `getActiveQuest()` | Current quest with live progress |
| `getSuggestedQuests()` | 3 quests sorted by preference / novelty |
| `getDailyChallenge()` | Today's challenge state |
| `getExplorerType()` | Type derived from top category visited |
| `getDNAStats()` | 6-axis chart data |
| `getStats()` | landmarks, quests, streak, cities |
| `getCategoryAffinities()` | Categories ranked by recency-weighted visit score |
| `getUnlockedTiers()` | `{ public: true, discovered: level>=2, hidden: level>=6 }` |

---

## 16. Services & Hooks

### `services/supabase.js`
| Function | Description |
|----------|-------------|
| `fetchAllLandmarks(lat, lon)` | All landmarks with distance annotation |
| `fetchNearbyLandmarks(lat, lon, radius)` | Radius-filtered, distance-sorted |
| `saveCheckIn / fetchCollections` | Collection CRUD |
| `saveUserProfile / fetchUserProfile` | Profile CRUD |
| `fetchUserDwellTimes(userId)` | Avg visit duration per category |
| `fetchCategoryCounts(userId)` | Visit count per category |
| `createExpedition / joinExpedition / leaveExpedition` | Expedition lifecycle |
| `fetchActiveExpeditions(lat, lon, radius=10000)` | Active expeditions within 10 km (triggers auto-expire before fetching) |
| `autoExpireExpeditions()` | Sets expeditions > 24 h old to `ended` |
| `fetchMyExpeditions(userId)` | All expeditions the user has joined |
| `fetchExpeditionMembers(expeditionId)` | Member list |
| `updateExpeditionStatus(id, status)` | Creator ends expedition |
| `fetchMessages / sendMessage` | Group chat |
| `subscribeToMessages / subscribeToDMs` | Realtime subscriptions |

### Hooks
| Hook | Description |
|------|-------------|
| `useLocation` | Continuous GPS tracking |
| `useWeather(lat, lon)` | OpenWeather — isRaining, isCold, isHot, isWindy, isClear, temp |
| `useBattery` | expo-battery — tier + `getAdjustedBudget(min)` |

---

## 17. Theme System

- `useTheme()` — provides `theme`, `setMode`, `isDark`
- **Auto dark mode** via `useColorScheme()` — switches to `dark_*` theme variant when system is dark
- 4 mode variants: `exploration` (amber), `discovery` (teal), `quest` (purple), `expedition` (coral)
- Each mode has both light and dark variants in `utils/theme.js`
- Screens use `theme.sheetBg`, `theme.cardBg`, `theme.textPrimary`, `theme.textSecondary`, `theme.border` — no hardcoded whites

---

## 18. Testing Playbook

### Test users (seed 001 + 002 required)

| User | Email | Visitor | XP | Level | Tiers visible |
|------|-------|---------|-----|-------|---------------|
| Alice Chen | alice@explorify.test | Tourist | ~2,820 | 5 | Public + Discovered |
| Marco Walsh | marco@explorify.test | Local | ~3,920 | 7 | All (incl. Hidden) |
| Sophie Kim | sophie@explorify.test | Tourist | 150 | 1 | Public only |
| Dev Admin | dev@explorify.test | Local | 5,000 | 11 | All |

---

### Feature-by-feature test guide

---

#### Recency-Weighted Category Affinity
**What it does:** Recent check-ins count more than old ones — 45-day exponential decay. Open NearbyScreen "For You" to see it in action.

| User | Steps | Expected |
|------|-------|----------|
| **Alice** | Log in → open NearbyScreen → select "For You" | Nature and Art cards appear near the top, above Architecture — driven by Howth (5 days ago) and National Gallery (3 days ago) outweighing 6 older Architecture visits |
| **Marco** | Log in → open NearbyScreen → select "For You" | History landmarks (Glasnevin, St. Michan's — 2–4 days ago) surface prominently; Food/Art fade despite higher total visit count |
| **Sophie** | Log in → NearbyScreen "For You" | Sorted by onboarding interests (Art, Nature) with no collection to bias it — pure interest matching |

---

#### XP Tier Gating (Hidden Spots)
**What it does:** Hidden landmarks are locked until Level 6 (2,500 XP). Locked cards show a grey lock icon, "Hidden Spot" as name, and "Unlock at Level 6" instead of category.

| User | Steps | Expected |
|------|-------|----------|
| **Sophie** | NearbyScreen (any sort mode) | All hidden-tier cards grey — lock icon, "Unlock at Level 6" |
| **Alice** | NearbyScreen → switch to "Rare" sort | Hidden cards grey at top of list (sorted first by tier); all discovered cards fully visible |
| **Marco** | NearbyScreen → switch to "Rare" sort | All 6 hidden landmarks fully visible and coloured — none locked |
| **Dev** | NearbyScreen → switch to "Rare" sort | All hidden landmarks fully visible |

---

#### NearbyScreen Sort Modes
**What it does:** Three chips above the radius selector change the ranking algorithm.

| Sort mode | Steps | Expected |
|-----------|-------|----------|
| **For You** | Tap "For You" chip | List re-ranks by recommendation score; top card gets amber "Top for you" ribbon |
| **Nearest** | Tap "Nearest" chip | Closest landmark first; order is purely distance-based |
| **Rare** | Tap "Rare" chip | Hidden → Discovered → Public ordering; within each tier sorted by recommendation score |

*Use any user. Marco and Dev see the full hidden tier in Rare mode; Sophie and Alice see locked cards.*

---

#### Time-of-Day Context Banner
**What it does:** Dark banner below the sheet header changes based on the current hour.

| Time range | Banner label | Category hint |
|------------|-------------|---------------|
| 06:00–10:59 | Morning picks | Parks and cafés |
| 11:00–13:59 | Lunchtime | Food and culture |
| 14:00–16:59 | Afternoon | Architecture and history |
| 17:00–20:59 | Evening picks | Galleries and nightlife |
| 21:00–05:59 | Night mode | Hidden spots and night venues |

**How to test:** Open NearbyScreen at different times of day. The banner updates in real time with no app restart needed.

---

#### Real DNA Match on Expeditions
**What it does:** Each expedition's DNA percentage is computed live from the user's preferences vs the expedition's categories.

| User | Expedition | Expected match | Steps |
|------|-----------|---------------|-------|
| **Alice** | Georgian Dublin: Doors & Details (arch+history) | High (~80–95 %) | Tap expedition pin on map → see DNA bar |
| **Alice** | After Dark: Pubs & Hidden Gems (nightlife+food) | Low (~28–40 %) | Same |
| **Marco** | After Dark: Pubs & Hidden Gems | High (~75–90 %) | Tap expedition pin |
| **Marco** | Georgian Dublin | Medium (~45–60 %) | Same |
| **Sophie** | Any expedition | Low–medium (no collection history) | Same |
| **Dev** | Georgian Dublin (creator) | High | Same |

**What to look for:** The animated gradient bar on the DNA Match card springs to the computed percentage. Label reads "Great fit" ≥ 85 %, "Good fit" ≥ 60 %, "Fair fit" otherwise.

---

#### Auto-Expiry of Stale Expeditions
**What it does:** `autoExpireExpeditions()` fires silently on every map load and flips any active expedition created > 24 hours ago to `ended`.

**Seed 002 plants:** "Night History Walk (should auto-expire)" — created 26 hours ago, status still `active` in DB at seed time.

| Steps | Expected |
|-------|----------|
| Log in as **Alice** or **Marco** → open Map tab | The Night History Walk expedition disappears from the map's coral pulse dots within seconds of load |
| Open Plus FAB → My Expeditions → Active tab | Night History Walk is NOT there |
| Switch to Past tab | Night History Walk IS there, status pill shows "Ended" |

> **Note:** If the seed was run more than 24 hours before testing, ALL seed expeditions will have already been auto-expired. Create a fresh test expedition directly from the app (Plus FAB → Start an Expedition) — it will appear immediately on the map when you return to the Map tab (useFocusEffect re-fetches on focus).

---

#### Expedition Map Pins — Visibility Requirements
For a pulsing pin to appear on the map the expedition must satisfy **all three**:

| Requirement | How to satisfy |
|-------------|---------------|
| `status = 'active'` | Created within the last 24 h; not manually ended |
| Has coordinates | Select a meeting point landmark in the Create form |
| Within 10 km of device | Works across all of Dublin city |

If an expedition is created without selecting a meeting point, it is stored with null coordinates and will not render a pin (but will still appear in My Expeditions and be joinable via shared link).

---

#### My Expeditions — Active / Past Tabs
**What it does:** Shows all expeditions the user has joined, split by status.

| User | Active tab | Past tab |
|------|-----------|---------|
| **Alice** | Georgian Art Morning Walk, Georgian Dublin: Doors & Details | Night History Walk (after auto-expire), Art & Architecture Morning |
| **Marco** | Georgian Art Morning Walk, Street Food Safari, After Dark: Pubs & Hidden Gems | Art & Architecture Morning, Night History Walk |
| **Sophie** | Georgian Dublin: Doors & Details | (empty — shows empty state CTA) |
| **Dev** | Street Food Safari, Georgian Dublin, After Dark | Art & Architecture Morning, Night History Walk |

**How to test:** Plus FAB on map → My Expeditions → switch tabs, scroll cards, tap "Open Chat", test Leave / End.

---

#### Leave / End Expedition
**What it does:** Members can leave; creator can end for everyone.

| Action | User | Steps |
|--------|------|-------|
| **Leave** | Alice (non-creator on Street Food Safari) | My Expeditions → find Street Food Safari → tap "Leave" → confirm → card disappears from Active |
| **End** | Dev (creator of Georgian Dublin) | My Expeditions → Georgian Dublin → tap "End" → confirm → card moves to Past; all members see it as ended |
| **Leave from chat** | Any member | Open expedition chat → ⋮ menu → Leave → confirm → navigates back to map |

---

#### Membership State on Expedition Preview
**What it does:** The Join/Continue button reflects real DB membership, not stale params.

| Scenario | Steps | Expected |
|----------|-------|----------|
| Already joined | Log in as **Alice** → tap Georgian Art Morning Walk pin on map | Button shows green "Continue Expedition" (not coral "Join") |
| Not yet joined | Log in as **Sophie** → tap Georgian Dublin pin | Button shows coral "Join Expedition" |
| After joining | Sophie taps "Join Expedition" | Button changes to green "Continue Expedition"; navigates to chat |

---

#### Route Builder — Personalised Dwell Times
**What it does:** Average time spent per category (from `dwell_time_min` in collections) replaces the default 30-min visit estimate.

| User | Steps | Expected |
|------|-------|----------|
| **Alice** | Route tab → select History → Build My Route | Waypoint cards show ~55–65 min visit time for History spots (her historical dwell times), not the default 30 min |
| **Marco** | Route tab → select Art → Build My Route | ~75–80 min visit time for Art spots |
| **Sophie** | Route tab → Build My Route | All waypoints show 30 min (no history to learn from) |

---

#### Dark Mode
**What it does:** App automatically switches to dark theme when system dark mode is enabled. No manual toggle needed.

**How to test:**
1. iOS Settings → Display & Brightness → Dark
2. Return to app — NearbyScreen sheet background, card backgrounds, and text colours all switch to dark variants (`#12121f`, `#1c1c2e`, `#F1F0FF`)
3. Switch back to Light — reverts instantly

---

#### Weather Adaptation (Route Builder)
**How to test:** Best tested with a real device outside on a rainy day, or by temporarily mocking weather in `useWeather`. When `isRaining = true`:
- Route Builder shows blue "Rainy — indoor spots prioritised" banner
- Score for indoor landmarks (Museums, Galleries) gets +18 bonus
- Outdoor landmarks get −15 penalty
- Built route will favour Chester Beatty Library, National Gallery, National Museum over Phoenix Park and Howth

---

#### Battery Adaptation (Route Builder)
**How to test:** Drain a test device to < 20 % or mock `batteryLevel`:
- Yellow banner: "Battery low — route shortened to 60 min" (when time budget > 60 min selected)
- Red banner: "Battery critical — route capped to 30 min" (when battery < 10 %)
- Individual time chips (1.5 hr, 2 hr, 3 hr) appear disabled/greyed out when battery would cap them

---

#### Explorer Type Shift (Quests → Profile)
**What it does:** Explorer type is derived from the most-visited category in collection. Adding recent check-ins in a new category shifts the type.

| User | Current type | After seed 002 extra check-ins |
|------|-------------|-------------------------------|
| Alice | Heritage Seeker (Architecture-heavy) | Begins shifting toward Nature/Art as affinity weight rebalances |
| Marco | Culinary Explorer (Art/Food) | Shifts toward Time Traveller as recent History check-ins accumulate |

**How to test:** Profile tab → Explorer Type card → note the label. Then do a check-in in a new category → return to profile → label may update.

---

#### Dynamic Quest Difficulty
**What it does:** Quest target and XP scale with the user's level.

| User | Level | Quest target | Quest XP (Heritage Trail) |
|------|-------|-------------|--------------------------|
| Sophie | 1 | 3 check-ins | 600 XP |
| Alice | 5 | 4 check-ins | 800 XP |
| Marco | 7 | 5 check-ins | 1,000 XP |
| Dev | 11 | 6 check-ins | 1,200 XP |

**How to test:** Quests tab → active quest card → compare the `n of m` target; Dev has a higher target than Sophie for the same quest.

---

#### Daily Challenge — Tourist vs Local
**What it does:** Locals get a harder challenge every other day (2 check-ins instead of 1).

| User | Visitor type | Today's challenge |
|------|-------------|-------------------|
| Sophie | Tourist | 1 check-in in the day's category |
| Alice | Tourist | 1 check-in |
| Marco | Local | 2 check-ins (on even `dayNum`), 1 on odd |
| Dev | Local | Same as Marco |

**How to test:** Quests tab → Daily Challenge card → compare targets between a tourist account and a local account on the same device.
