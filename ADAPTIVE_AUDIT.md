# Explorify — Complete Adaptive Systems Audit (Updated)

> **Date**: 2026-04-09  
> **Branch**: feature/refactor-new  
> **Status**: Post-refactor — LLM service, drift detection, narrative quests, and Next Best guidance now implemented

---

## Table of Contents

1. [What Has Been Implemented Since Last Audit](#1-what-has-been-implemented-since-last-audit)
2. [Full Current-State Adaptive Feature Map](#2-full-current-state-adaptive-feature-map)
3. [User Modelling — Current State](#3-user-modelling--current-state)
4. [User Control — Current State](#4-user-control--current-state)
5. [Adaptive Techniques in Use](#5-adaptive-techniques-in-use)
6. [Critical Remaining Gaps](#6-critical-remaining-gaps)
7. [What to Improve — Prioritised](#7-what-to-improve--prioritised)
8. [What to Implement — New Features](#8-what-to-implement--new-features)
9. [Technical Implementation Guide](#9-technical-implementation-guide)
10. [Full Scorecard](#10-full-scorecard)

---

## 1. What Has Been Implemented Since Last Audit

These features were previously gaps — they now exist in the codebase:

### LLM Service (`backend/src/services/llmService.js`)

A Groq-backed LLM service using **LLaMA 3 8B** is live with four capabilities:

| Method | Purpose | Status |
|---|---|---|
| `getPersonalisedDescription(landmark, userProfile)` | Rewrites landmark description based on visitor_type, interests, level, detail_level, language_pref | **Implemented** |
| `getRouteReasons(landmark, context)` | LLM-generated 3-bullet reasons why a landmark matches the user right now | **Implemented** |
| `getConversationalRefinement(userId, recentVisits)` | Short nudge suggesting an interest pivot based on recent visit categories | **Implemented** |
| `getDailyChallenge(userProfile, weather, timeOfDay)` | Contextual daily challenge generated from user interests + weather + time | **Implemented** |

**Critical issue**: `getPersonalisedDescription` accepts `language_pref` and `detail_level` but these are not plumbed through from the mobile client to the API call in `LandmarkDetailScreen.js`. The screen uses `landmark?.personalised_description` (line 224) which arrives from route params — but there is no API call that fetches this field before navigation. The LLM description is available on the backend but **never called from the frontend**.

### Drift Detection Service (`backend/src/services/driftDetectionService.js`)

A full cosine-similarity drift detector is implemented:
- `getDecayedCategoryCounts(userId, days)` — time-decayed category weights (30-day half-life)
- `cosineSimilarity(vecA, vecB)` — full implementation
- `detectDrift(userId)` — compares last-30-days vs all-time, returns `{ drifted, from, to, score }`

**Critical issue**: The drift endpoint (`POST /api/profile/drift-check`) exists in `profile.js` and is mounted in `server.js`, but **no frontend screen calls it**. Drift detection runs only when explicitly triggered via API — it is never called on login, on app launch, or on any user action. The result is never shown to the user.

### Profile Routes (`backend/src/routes/profile.js`)

Three new endpoints:
- `POST /api/profile/drift-check` — drift detection
- `POST /api/profile/daily-challenge` — LLM-generated daily challenge
- `POST /api/profile/refinement` — conversational preference nudge

**Critical issue**: None of these three endpoints are called from the mobile frontend anywhere in the codebase.

### Database Schema (Fully Updated)

The schema now includes all previously recommended columns:

```
users:
  detail_level TEXT DEFAULT 'overview'          ✓
  language_pref TEXT DEFAULT 'en'               ✓
  onboarding_group_context TEXT DEFAULT 'solo'  ✓
  drift_detected_at TIMESTAMP                   ✓
  drift_from_category TEXT                      ✓
  drift_to_category TEXT                        ✓

collections:
  checked_in_at TIMESTAMP DEFAULT NOW()         ✓
  rating INT                                    ✓
  dwell_time_min INT                             ✓
  context JSONB                                 ✓

expeditions:
  is_narrative BOOLEAN DEFAULT false            ✓
  expedition_landmarks (step_number)            ✓

landmarks:
  tags TEXT[]                                   ✓
  tier TEXT                                     ✓
  avg_visit_duration_min INT                    ✓
```

### Narrative Quests

The `expeditions` table has `is_narrative` flag. `ExpeditionService.getUserQuests()` fetches ordered landmarks for narrative quests. The Viking Trail is seeded. `MapScreen.js` implements narrative locking: when active quest is narrative, only the next sequential landmark is shown on the map (line 211-215).

### Next Best Local Guidance (MapScreen)

`MapScreen.js` now renders a "Next Best" card (lines 357-374) at the bottom of the map showing the top-ranked landmark with its reason. Switches to "Next Quest Step" label when in a narrative quest. **This is fully functional.**

### Context HUD on Map

A weather + time-slot HUD (lines 251-276) is overlaid on the map showing active contextual adaptation factors. **Implemented and functional.**

### Battery Banner

Explicit warning banner (lines 280-291) shown when battery is low/critical with the specific constraint applied (30-min cap vs 1-hour cap). **Implemented and functional.**

### DNA Match for Expeditions

`MapScreen.goToExpedition()` (line 144-146) computes a DNA match percentage between user interests and expedition categories before navigating to the preview. **Implemented.**

---

## 2. Full Current-State Adaptive Feature Map

### Backend Scoring Pipeline

| Feature | Location | Working? |
|---|---|---|
| Cold Start detection + stereotypes | `recommendationService.js:78`, `routeService.js:305` | ✅ Yes |
| Time-of-day category weights | `routeService.js:28-45` | ✅ Yes |
| Weather-driven indoor/outdoor scoring | `routeService.js:54-79` + SQL filter | ✅ Yes |
| Visitor type scoring (tourist/local) | `routeService.js:83-97` | ✅ Yes |
| Adaptive difficulty via XP gating | `routeService.js:101-116` | ✅ Yes |
| Category novelty bonus | `routeService.js:120-128` | ✅ Yes |
| Dwell time per-user per-category | `routeService.js:293-299` | ✅ Yes |
| Walking pace adaptation | `routeService.js:408` | ✅ Yes |
| Route abandonment adaptation | `routeService.js:228-230` | ✅ Yes |
| Battery-aware routing constraints | `routeService.js:241-244` | ✅ Yes |
| Group context (kids/elderly/large) | `recommendationService.js:372-392` | ✅ Yes |
| Expedition collective preferences | `recommendationController.js:27-32` | ✅ Yes |
| Accessibility hard-lock for groups | `recommendationService.js:304-312` | ✅ Yes |
| Scrutability `reasons[]` per landmark | `routeService.js:179-195` | ✅ Yes |
| Active adaptations metadata object | `recommendationService.js:86-238` | ✅ Yes |
| **Rating-based scoring** | Nowhere | ❌ **NOT IMPLEMENTED** |
| **Temporal decay on category counts** | Drift service only; never used in scoring | ❌ **NOT WIRED** |

### LLM Features

| Feature | Backend | Frontend Call | Working? |
|---|---|---|---|
| Personalised landmark description | `llmService.getPersonalisedDescription` | **Never called** from mobile | ❌ Broken pipeline |
| LLM route reasons | `llmService.getRouteReasons` | **Never called** | ❌ Broken pipeline |
| Conversational refinement | `POST /api/profile/refinement` | **Never called** | ❌ Broken pipeline |
| LLM daily challenge | `POST /api/profile/daily-challenge` | **Never called** | ❌ Broken pipeline |

### Drift Detection

| Feature | Backend | Frontend | Working? |
|---|---|---|---|
| Drift computation (cosine similarity) | `driftDetectionService.detectDrift` | **Never called** | ❌ Broken pipeline |
| Drift notification to user | Nothing | Nothing | ❌ Not implemented |

### Frontend Adaptive UI

| Feature | Screen | Working? |
|---|---|---|
| Adaptive Profile chips (time, weather, battery, interests) | HomeScreen `AdaptiveProfileCard` | ✅ Yes |
| Scrutability insights card | ProfileScreen | ✅ Yes |
| Exploration DNA radar chart | ProfileScreen | ✅ Yes |
| Explorer Type label | ProfileScreen | ✅ Yes |
| Visitor type toggle | ProfileScreen | ✅ Yes |
| Reset Behavioral Learning button | ProfileScreen | ✅ Yes |
| Context HUD (weather + time slot) | MapScreen | ✅ Yes |
| Next Best guidance card | MapScreen | ✅ Yes |
| Battery banner with constraint message | MapScreen | ✅ Yes |
| Narrative quest locking (next step only) | MapScreen | ✅ Yes |
| Cold start hint on HomeScreen | HomeScreen | ✅ Yes |
| LLM description display | LandmarkDetailScreen | ⚠️ UI exists, data never fetched |
| "Story generated for you 🪄" label | LandmarkDetailScreen:222 | ⚠️ Misleading — falls back to static text |
| Drift notification | Nowhere | ❌ Not implemented |
| Conversational refinement screen | Nowhere | ❌ Not implemented |
| LLM daily challenge | `useStore.getDailyChallenge` still hardcoded | ❌ Not connected |

---

## 3. User Modelling — Current State

### What Is Modelled

| Dimension | Source | Format | Used in Scoring? |
|---|---|---|---|
| Interests (categories) | Explicit — onboarding | `string[]` in AsyncStorage + Supabase | ✅ Yes |
| Visitor type (tourist/local) | Explicit — toggle | `string` in preferences | ✅ Yes |
| Accessibility minimum | Explicit — Profile (hidden) | `int 0-5` | ✅ Yes |
| Group context | Explicit — not in onboarding | `string` in preferences | ✅ Yes |
| Walking speed | Implicit — computed from navigation | `float km/h` | ✅ Yes |
| Category dwell times | Implicit — from check-in history | `object { category: avg_min }` | ✅ Yes |
| Category visit counts | Implicit — from collection history | `object { category: count }` | ✅ Yes |
| Abandonment streak | Implicit — route abandonment | `int` | ✅ Yes |
| Total XP / level | Implicit — from all check-ins | `int` | ✅ Yes |
| Collection (visited landmarks) | Implicit — check-in history | `array` | ✅ Yes |
| Ratings per landmark | Explicit — feedback modal | `int 1-5` in DB | ❌ **Never read back into scoring** |
| Detail level preference | Explicit — DB column | `string` | ❌ **Never read on frontend** |
| Language preference | Explicit — DB column | `string` | ❌ **Never read on frontend** |
| Temporal interest drift | Implicit — computed by drift service | `{ from, to, score }` | ❌ **Never used** |

### Stereotype / Overlay

**Current**: Binary (tourist vs local). No additional stereotypes.  
**Cold-start defaults**: `COLD_START_DEFAULTS.tourist` and `COLD_START_DEFAULTS.local` in `recommendationService.js:6-17`.

### Model Completeness

The user model **captures** many dimensions but only **acts on** half of them. The rating signal, detail level, language preference, and drift output are all stored but never fed back into adaptation.

### Implicit vs Explicit vs Blended

| Type | Examples | Status |
|---|---|---|
| Explicit | Interests, visitor type, group context, accessibility | Working |
| Implicit | Dwell times, walk speed, abandonment, category counts | Working |
| Blended | Rating → interest refinement | **Broken** |
| Blended | Drift signal → adaptive reprioritisation | **Broken** |

---

## 4. User Control — Current State

| Dimension | Implementation | Gaps |
|---|---|---|
| **Freedom** | Visitor type toggle in Profile; interests set at onboarding only | No way to edit individual interests post-onboarding without full reset |
| **Regulations** | "Reset Behavioral Learning" resets walk speed, dwell, abandonment | Does not reset interests or visitor type; no per-dimension granular control |
| **Scrutability** | HomeScreen chips, ProfileScreen insights, per-landmark `reasons[]` | `reasons[]` are hardcoded emoji strings, not LLM-generated explanations; LLM description says "Story generated for you" but is actually static fallback text |
| **Metacognition** | DNA chart, Explorer Type | No summary of "what Explorify has learned about you overall" in natural language |

**Transparency deficit**: The label "Story generated for you 🪄" in `LandmarkDetailScreen.js:222` is misleading — the LLM description endpoint is never called from the frontend, so users see a generic static fallback. This is a trust issue.

---

## 5. Adaptive Techniques in Use

Mapping against the formal taxonomy:

| Technique | Category | Present | Quality |
|---|---|---|---|
| Adaptive content selection | Content | Partial — landmark scoring/ranking | Scoring is good; content text itself is not adapted |
| Adaptive content presentation | Presentation | None | No format switching (overview/deep), no language switching |
| Adaptive navigation guidance | Navigation | Partial | Next Best card implemented; no "you are N% through your journey" global view |
| Adaptive navigation support | Navigation | Partial | Narrative quest locks next step; non-narrative offers no sequential guidance |
| Curriculum sequencing | Content | Narrative quests only | Viking Trail exists; only one seeded |
| Adaptive annotation | Presentation | None | Landmark pins show same information to all users |
| Stereotyped initialisation (cold start) | Modelling | Good | Tourist/local with tag boosting |
| Overlay model (refinement from behaviour) | Modelling | Partial | Dwell times, walk speed, abandonment — but ratings and drift not used |
| Student/user model inspection | Control | Good | Profile DNA, insights card |
| User-controlled adaptation | Control | Partial | Toggle visitor type, reset learning; no fine-grained control |
| Contextual adaptation | Context | Excellent | Weather, time, battery, group all wired |

---

## 6. Critical Remaining Gaps

### GAP A — LLM Pipeline is Entirely Disconnected from Frontend (HIGH PRIORITY)

The single biggest issue in the current codebase. Four LLM methods are implemented on the backend and routes are registered — but zero frontend screens call any of them.

**Specific broken connections:**

1. `LandmarkDetailScreen.js:224` reads `landmark?.personalised_description` but this field is never populated because no API call is made to `/api/landmarks/:id/description` before or during navigation to this screen.

2. The `useStore.getDailyChallenge()` function at line 277 of `useStore.js` returns a hardcoded `{ category: 'Nature', target: 3, xpBonus: 100 }` — it does not call `POST /api/profile/daily-challenge`.

3. `POST /api/profile/refinement` is never triggered. The "conversational refinement" concept has no entry point in any screen.

4. `POST /api/profile/drift-check` is never triggered. There is no `useEffect` on app launch, login, or any screen that calls it.

**Result**: The entire LLM + drift layer is backend-only dead code from the user's perspective.

---

### GAP B — Rating Feedback Loop Still Broken

`collections.rating` is stored (DB schema confirmed). `FeedbackModal` sends it. `checkIn()` in `useStore.js` posts it to `/api/collections`. But in both `recommendationService.js` and `routeService.js`, the scoring functions never query `AVG(rating)` per category per user.

This was identified in the previous audit and is **still not fixed**.

---

### GAP C — Temporal Decay Not Used in Main Scoring

`driftDetectionService.getDecayedCategoryCounts()` correctly implements time-decayed weights. But `routeService.js` and `recommendationService.js` use raw `COUNT(*)` for category counts, not the decayed version. The decay logic exists only in the drift detector and is never imported by the scoring services.

---

### GAP D — Onboarding Still Only 2 Dimensions

Onboarding collects: interests, visitor type.  
Schema supports: `onboarding_group_context`, `detail_level`, `language_pref`, `accessibility_needs`.  
**None of these are asked in onboarding.** They exist as columns with defaults but are never populated by the user.

---

### GAP E — No Global Journey Orientation

The app has local guidance (Next Best card) but no global orientation. There is no widget or screen that tells the user:
- How much of Dublin's landmark space they have explored (% of categories covered)
- What their journey arc looks like ("you've mostly visited History — try Art for balance")
- A macro goal ("Complete the City Explorer badge by visiting 1 landmark in all 6 categories")

This is the "whole hyperspace orientation" component from adaptive navigation support theory.

---

### GAP F — Interests Are Immutable Post-Onboarding

The interests array set during onboarding is the permanent foundation of all category-preference scoring. There is no screen, setting, or mechanism to edit individual interests after onboarding without doing a full "Reset Behavioral Learning" (which only resets learned behaviours, not explicit preferences).

---

### GAP G — `detail_level` and `language_pref` Are Invisible to the User

These columns exist in the database with correct schema. The LLM service accepts them as input. But:
- The ProfileScreen has no toggle for `detail_level`
- The ProfileScreen has no selector for `language_pref`
- The user cannot access or modify these fields through any UI element

---

### GAP H — Expedition Collective Modelling Has No Conflict Resolution

`expeditionService.aggregateExpeditionPreferences()` is referenced in `recommendationController.js:29` but is never defined in `expeditionService.js`. The method does not exist — calling it will throw at runtime.

---

### GAP I — "Story generated for you 🪄" is a False Promise

`LandmarkDetailScreen.js:222` displays the label "Story generated for you 🪄" above the description. The description it shows is `landmark?.personalised_description || description || fallback`. Since `personalised_description` is never set (the LLM endpoint is never called), users always see the raw static description or a generic fallback string. This actively misleads users about the app's adaptive capability.

---

### GAP J — Narrative Quest is Seeded but Fragile

The Viking Trail is seeded with 3 landmarks. `expeditionService.handleDiscovery()` correctly advances narrative quests sequentially. However:
- Only 1 narrative quest exists
- The story content per landmark (the actual narrative text fragment) is not stored anywhere — narrative quests and regular quests show the same landmark description
- There is no "story chapter" system

---

## 7. What to Improve — Prioritised

### Priority 1 — Connect LLM Pipeline to Frontend (1–2 days)

**Fix the broken connections. This is the highest-impact, most urgent change.**

#### 1.1 Fetch personalised description in LandmarkDetailScreen

In `mobile/src/screens/LandmarkDetailScreen.js`, before rendering, call the description endpoint:

```js
// Add near the top of the component, after landmark is received from params
const [personalisedDesc, setPersonalisedDesc] = useState(null);

useEffect(() => {
  if (!landmark?.id) return;
  const { preferences, interests, getLevel } = useStore.getState();
  api.post('/landmarks/describe', {
    landmark_id: landmark.id,
    user_profile: {
      visitor_type: preferences.visitor_type,
      interests,
      level: getLevel(),
      detail_level: preferences.detail_level || 'overview',
      language_pref: preferences.language_pref || 'en',
    }
  })
  .then(r => setPersonalisedDesc(r.data.description))
  .catch(() => {}); // silent fallback to static description
}, [landmark?.id]);
```

Then replace line 224:
```js
// Before:
<Text style={styles.desc}>{landmark?.personalised_description || description || ...}</Text>

// After:
<Text style={styles.desc}>{personalisedDesc || description || 'A fascinating place to visit.'}</Text>
```

Add a corresponding backend route in `landmarks.js`:
```js
router.post('/describe', async (req, res) => {
  const { landmark_id, user_profile } = req.body;
  const landmarkResult = await query('SELECT * FROM landmarks WHERE id = $1', [landmark_id]);
  const landmark = landmarkResult.rows[0];
  if (!landmark) return res.status(404).json({ error: 'Not found' });
  const result = await llmService.getPersonalisedDescription(landmark, user_profile);
  res.json(result);
});
```

Remove the misleading "Story generated for you 🪄" label or only show it when `personalisedDesc` is actually set (not null).

#### 1.2 Connect Daily Challenge to LLM

In `mobile/src/store/useStore.js`, replace `getDailyChallenge()` (currently hardcoded) with an async action:

```js
fetchDailyChallenge: async () => {
  try {
    const api = (await import('../services/api')).default;
    const { preferences, interests } = get();
    const weather = null; // pass from weather hook if available
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const response = await api.post('/profile/daily-challenge', {
      preferences: { ...preferences, interests },
      weather,
      timeOfDay,
    });
    set({ dailyChallenge: response.data });
  } catch (e) {
    // keep default hardcoded fallback
  }
},
```

#### 1.3 Trigger Drift Check on Login / App Resume

In `mobile/src/store/useStore.js`, add to `syncFromSupabase()`:

```js
// After syncing collection and profile, check for drift
if (authUser?.id) {
  try {
    const api = (await import('../services/api')).default;
    const driftResult = await api.post('/profile/drift-check', { user_id: authUser.id });
    if (driftResult.data.drifted) {
      set({ driftAlert: { from: driftResult.data.from, to: driftResult.data.to } });
    }
  } catch (e) {}
}
```

Then in `HomeScreen.js`, read `driftAlert` from store and show a banner:
```js
const driftAlert = useStore(s => s.driftAlert);
// Render: "Your taste is evolving — you've been visiting more {to} spots lately. Update your profile?"
```

---

### Priority 2 — Close the Rating Feedback Loop (2–3 hours)

In `backend/src/services/routeService.js`, inside `generateRoute()`, add a ratings query alongside existing DB queries:

```js
// Add to the Promise.all block:
query(
  `SELECT l.category,
     ROUND(AVG(c.rating)::numeric, 2) AS avg_rating
   FROM collections c
   JOIN landmarks l ON l.id = c.landmark_id
   WHERE c.user_id = $1 AND c.rating IS NOT NULL AND c.rating > 0
   GROUP BY l.category`,
  [userId]
)
```

Then in the scoring context:
```js
const ratingMap = {};
ratingResult.rows.forEach(({ category, avg_rating }) => {
  const appCat = BACKEND_TO_APP_CAT[category] || category;
  ratingMap[appCat] = parseFloat(avg_rating);
});
context.ratingMap = ratingMap;
```

In `calculateScoreWithReasons()`, add:
```js
// Rating signal: -0.20 to +0.20 relative to neutral (3.0)
const appCat = BACKEND_TO_APP_CAT[landmark.category];
const userRating = context.ratingMap?.[appCat];
if (userRating !== undefined) {
  const ratingBonus = ((userRating - 3.0) / 2.0) * 0.20;
  compositeScore += ratingBonus;
  if (ratingBonus > 0.08) reasons.push('⭐ You rated this category highly');
  if (ratingBonus < -0.08) reasons.push('⬇️ Based on your feedback');
}
```

Apply the same pattern to `recommendationService.js`.

---

### Priority 3 — Add `detail_level` and Language Controls to Profile UI (1–2 hours)

In `mobile/src/screens/ProfileScreen.js`, in the "Adaptive Persona" section, add toggles:

```js
// Detail level toggle
<Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Content Depth</Text>
<View style={styles.visitorTypeContainer}>
  {[
    { id: 'overview', label: '📋 Overview', desc: 'Key highlights only.' },
    { id: 'deep dive', label: '🔬 Deep Dive', desc: 'History, architecture, full context.' }
  ].map(opt => (
    <TouchableOpacity
      key={opt.id}
      style={[styles.visitorOption, preferences.detail_level === opt.id && { borderColor: theme.primary }]}
      onPress={() => setPreferences({ detail_level: opt.id })}
    >
      <Text style={styles.visitorLabel}>{opt.label}</Text>
      <Text style={styles.visitorDesc}>{opt.desc}</Text>
    </TouchableOpacity>
  ))}
</View>
```

This feeds directly into the LLM prompt in `llmService.getPersonalisedDescription()` which already reads `detail_level`.

---

### Priority 4 — Fix the Expedition `aggregateExpeditionPreferences` Runtime Error (30 minutes)

In `backend/src/services/expeditionService.js`, add the missing method:

```js
async aggregateExpeditionPreferences(expeditionId) {
  const result = await query(
    `SELECT u.preferences, u.accessibility_needs
     FROM expedition_members em
     JOIN users u ON u.id = em.user_id
     WHERE em.expedition_id = $1`,
    [expeditionId]
  );

  if (result.rows.length === 0) return {};

  // Collect all preferred categories across members
  const categoryVotes = {};
  let maxAccessibilityNeeded = 0;
  let memberCount = result.rows.length;

  result.rows.forEach(row => {
    const prefs = row.preferences || {};
    (prefs.preferred_categories || []).forEach(cat => {
      categoryVotes[cat] = (categoryVotes[cat] || 0) + 1;
    });
    if (row.accessibility_needs > maxAccessibilityNeeded) {
      maxAccessibilityNeeded = row.accessibility_needs;
    }
  });

  // Include categories voted for by >50% of members
  const preferred_categories = Object.entries(categoryVotes)
    .filter(([, votes]) => votes / memberCount >= 0.5)
    .map(([cat]) => cat);

  return {
    preferred_categories,
    accessibility_min: maxAccessibilityNeeded,
    high_accessibility_needed: maxAccessibilityNeeded >= 4,
    is_expedition: true,
    member_count: memberCount,
  };
}
```

---

### Priority 5 — Use Temporal Decay in Main Scoring (2–3 hours)

Import and use `driftDetectionService.getDecayedCategoryCounts()` inside `routeService.generateRoute()` and `recommendationService.getRecommendations()` when building `categoryCounts`:

```js
// In routeService.generateRoute(), replace:
query(`SELECT l.category, COUNT(*)::int as cnt FROM collections c ...`)

// With:
driftDetectionService.getDecayedCategoryCounts(userId, 60)  // 60-day window
```

This means recent visits count more in novelty scoring — a user's current interests drive the model, not their year-old history.

---

## 8. What to Implement — New Features

### Feature 1 — Richer Onboarding (3 additional steps)

**Files to change**: `mobile/src/screens/OnboardingScreen.js`, `mobile/src/store/useStore.js`

Add steps 3 and 4 to the existing 2-step onboarding:

**Step 2 (new)** — Exploration style:
```
"How do you like to explore?"
[ Quick Overview ] [ Leisurely Browse ] [ Deep Research ]
→ maps to: preferences.detail_level = 'overview' | 'overview' | 'deep dive'
```

**Step 3 (new)** — Context:
```
"Who are you exploring with?"
[ Just me ] [ With kids ] [ With elderly ] [ Group ]
→ maps to: preferences.group_context + users.onboarding_group_context
```

Step 4 (accessibility) can remain optional via a "skip" — keep it brief and positive-framed.

The `completeOnboarding()` action in `useStore.js` already accepts a `visitorType` parameter — extend its signature to accept `groupContext` and `detailLevel` and persist them.

---

### Feature 2 — Global Journey Orientation Widget

**Files to change**: `mobile/src/screens/HomeScreen.js`

Add a "Dublin Explorer Progress" card below `QuickStats`:

```js
function JourneyProgress({ collection }) {
  const DOMAINS = ['Architecture', 'History', 'Nature', 'Art', 'Food', 'Nightlife'];
  const visited = new Set(collection.map(c => c.category));
  const covered = DOMAINS.filter(d => visited.has(d)).length;
  const missing = DOMAINS.filter(d => !visited.has(d));

  return (
    <View style={styles.journeyCard}>
      <Text style={styles.journeyTitle}>City Explorer Journey</Text>
      <Text style={styles.journeyProgress}>{covered} of 6 districts explored</Text>
      <View style={styles.journeyDots}>
        {DOMAINS.map(d => (
          <View key={d} style={[styles.dot, visited.has(d) && styles.dotFilled]} />
        ))}
      </View>
      {missing.length > 0 && (
        <Text style={styles.journeySuggestion}>
          Try {missing[0]} next for a complete city picture
        </Text>
      )}
    </View>
  );
}
```

This gives the user a start-state → goal-state narrative arc.

---

### Feature 3 — Interest Edit Screen

**Files to create**: `mobile/src/screens/EditInterestsScreen.js`  
**Files to change**: `mobile/src/screens/ProfileScreen.js`, `mobile/src/navigation/AppNavigator.js`

Allow users to toggle individual interests from their profile, without triggering a full reset. The same `CATEGORIES` grid from `OnboardingScreen.js` can be reused. On save, update `interests` in the store and sync to Supabase. This closes GAP F entirely.

---

### Feature 4 — Conversational Refinement Entry Point

**Files to change**: `mobile/src/screens/ProfileScreen.js`

Add a "Refine My Taste" button in the Profile that calls `POST /api/profile/refinement` with the last 5 collection items, then presents the LLM's nudge in a modal with two buttons: "Yes, try something new" (updates interests) or "No, I'm happy" (dismisses).

```js
const handleRefinement = async () => {
  const recentVisits = collection.slice(-5);
  const response = await api.post('/profile/refinement', {
    user_id: authUser.id,
    recentVisits,
  });
  Alert.alert('Your Explorer Compass', response.data.message, [
    { text: 'Yes!', onPress: () => {/* flag interests refresh */} },
    { text: 'Not now', style: 'cancel' },
  ]);
};
```

---

### Feature 5 — More Narrative Quests + Story Chapter Content

**Files to change**: `database/schema.sql`, `backend/src/services/expeditionService.js`

Add a `story_fragment TEXT` column to `expedition_landmarks`:

```sql
ALTER TABLE expedition_landmarks ADD COLUMN story_fragment TEXT;
```

Add story fragments to the Viking Trail seed. In `LandmarkDetailScreen.js`, when the active quest is narrative and the landmark matches the current step, surface the story fragment above the description. This fulfils the "coherent narrative offering to a user" definition.

---

### Feature 6 — Adaptive Landmark Annotation on Map

**Files to change**: `mobile/src/components/explorify/MapMarkers.js`, `mobile/src/components/explorify/PinDetailModal.js`

Instead of all pins looking the same, adapt pin rendering:
- Pins matching user interests → full colour, larger
- Pins already visited → greyed out, smaller
- Narrative quest next-step → pulsing ring animation (similar to check-in range ring)
- Hidden tier landmarks (only if XP unlocked) → distinctive purple pin with lock icon

---

## 9. Technical Implementation Guide

### New Backend Route Needed

Add to `backend/src/routes/landmarks.js`:

```js
const llmService = require('../services/llmService');

router.post('/describe', async (req, res, next) => {
  try {
    const { landmark_id, user_profile } = req.body;
    const result = await query('SELECT * FROM landmarks WHERE id = $1', [landmark_id]);
    const landmark = result.rows[0];
    if (!landmark) return res.status(404).json({ error: 'Landmark not found' });
    const response = await llmService.getPersonalisedDescription(landmark, user_profile);
    res.json(response);
  } catch (err) {
    next(err);
  }
});
```

### Caching Strategy for LLM Calls

To avoid high Groq API costs and latency, cache LLM descriptions in the `collections.context` JSONB field or a simple in-memory cache keyed by `(landmark_id + interest_hash)`:

```js
// In llmService.js — simple in-process cache
const descriptionCache = new Map();

getPersonalisedDescription(landmark, userProfile) {
  const key = `${landmark.id}-${userProfile.visitor_type}-${userProfile.interests?.join(',')}-${userProfile.detail_level}`;
  if (descriptionCache.has(key)) return Promise.resolve(descriptionCache.get(key));
  
  // ... make Groq call ...
  descriptionCache.set(key, result);
  return result;
}
```

For production, use Redis or Supabase as the cache store.

### Model Switching Note

The current LLM uses `llama3-8b-8192` on Groq. For richer, more contextual descriptions, consider upgrading to `llama3-70b-8192` for landmark descriptions (higher quality, slightly slower) while keeping `llama3-8b-8192` for route reasons (speed-critical). Alternatively, the `claude-haiku-4-5-20251001` model via the Anthropic API offers strong instruction-following for short structured outputs.

---

## 10. Full Scorecard

| Adaptive Dimension | Previous State | Current State | Target |
|---|---|---|---|
| Cold Start | Good | Good — unchanged | Improve with richer onboarding |
| User Model Completeness | Medium | Medium — detail_level/language exist but inaccessible | High — expose via UI |
| Implicit Adaptation | Medium | Medium — dwell/walk/abandonment working; ratings still unused | High — close rating loop |
| Explicit Adaptation | Low | Low — visitor type only editable; interests locked | Medium — add interest edit, detail level toggle |
| LLM Integration | None | **Backend only** — frontend never calls any LLM endpoint | Integrated — must connect frontend |
| Drift Detection | None | **Backend only** — never triggered from app | Active — trigger on login + surface to user |
| Scrutability | Good | Good — chips + insights working; "Story generated" label is false | Excellent — remove false label; use real LLM descriptions |
| User Freedom | Low | Low — reset only, no interest editing | Medium — interest edit screen + conversational refinement |
| Navigation: Local Guidance | None → Good | **Next Best card implemented** ✅ | Good |
| Navigation: Global Orientation | None | None — still missing | Add Journey Progress widget |
| Content Adaptation | None | Backend implemented; **frontend never calls it** | Connect frontend → LLM → personalised text |
| Format Adaptation (detail level) | None | DB column exists, no UI | Add toggle to Profile + wire to LLM prompt |
| Interest Drift | None | Service exists, never runs | Trigger on login + notify user |
| Narrative Flow | None → Partial | Viking Trail seeded + narrative locking on map | Add story fragments per landmark step |
| Expedition Collective Modelling | Naive | `aggregateExpeditionPreferences` method **missing** — runtime error | Implement the missing method |
| Background / Traits | None | None | Begin with detail level + language pref |
| Feedback Loop (ratings) | Broken | Still broken | 2–3 hours to fix — high impact |
| Temporal Decay | None | In drift service only | Import into main scoring |

### Summary

The refactor has built excellent infrastructure — the LLM service, drift detection, narrative quests, and live contextual guidance are all properly architected. The primary failure is **integration**: the backend is ahead of the frontend by approximately 6 features. The most important next steps are not architectural — they are plumbing. Connect the LLM description endpoint to `LandmarkDetailScreen`, trigger drift detection on login, close the rating feedback loop, and expose `detail_level` in the Profile UI. These changes require hours, not weeks, and will meaningfully transform the user's experience from a rule-based scoring app into a genuinely personalised adaptive system.
