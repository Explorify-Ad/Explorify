# Explorify — Project Context

## What is Explorify?

Explorify is an adaptive tourism gamification platform for Dublin, Ireland. It generates personalized walking routes that adjust in real time based on the user's walking pace, accessibility needs, weather, time of day, and device battery level. Built as a 4-week academic project.

**Core value proposition:** not just a map app — the route *adapts* to you.

---

## Three Pillars

| Pillar | Description | Status |
|--------|-------------|--------|
| Smart Route Builder | Dynamic walking routes based on pace, preferences, time budget | Backend logic built; mobile UI is placeholder |
| Universal Access Mode | Routes adapted for mobility, visual, or hearing needs | Filtering in backend; no user preference screen yet |
| Contextual Safety System | Adjusts for weather, time of day, battery level | Defined but not implemented anywhere |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native (Expo) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT) |
| Maps | React Native Maps (Google / Apple Maps) |
| Weather | OpenWeatherMap API |
| State | Zustand |
| Hosting | Render.com (backend) + Supabase (DB) |

---

## Current State (as of 2026-03-15 — Week 3 of 4)

### What's working
- Monorepo structure scaffolded with all major files
- Backend route generation: nearest-neighbor algorithm in `routeService.js`
- Backend recommendation scoring: category, accessibility, weather, visit history in `recommendationService.js`
- Zustand store structured with user, landmarks, routes, collection, UI state
- All screen shells exist in mobile app

### What's placeholder / incomplete

| Area | File | Issue |
|------|------|-------|
| Route Builder UI | `mobile/src/screens/RouteBuilderScreen.js` | Pure placeholder — no inputs, no API call |
| Home Screen | `mobile/src/screens/HomeScreen.js` | No user greeting, stats, or weather widget |
| Supabase | — | Project not set up; no DB schema applied |
| Dublin landmarks | `database/` | No seed data yet |
| Auth flow | — | Supabase Auth not integrated in mobile |
| Active route screen | — | No screen to follow a route step-by-step |
| Tests | `backend/tests/` | Nothing written yet |

---

## Adaptive Signals — Gap Analysis

| Signal | Backend | Mobile | Notes |
|--------|---------|--------|-------|
| Weather (rain → prefer indoor) | Partial | No UI | `weatherService.js` exists; not surfaced in UI |
| Accessibility level | Filter query | No preference screen | User can't set this yet |
| Time budget | Route truncation | No input | Needs RouteBuilder UI |
| Walking pace | **Hardcoded 4.5 km/h** | None | Biggest gap — core promise of the app |
| Battery level | Not implemented | Not implemented | `expo-battery` can provide this |
| Time of day | Not implemented | Not implemented | Evening → indoor; night → safety mode |
| User history learning | One-time preference | No UI | Score penalises revisits but no trend learning |
| Distance from user | Not weighted | — | Not factored into recommendation score |
| Opening hours | Not in schema | — | No landmark hours data |

---

## Recommendation Scoring (current)

Located in `backend/src/services/recommendationService.js`:

```
Base score:       50
Unvisited bonus: +15
Category match:  +20
Accessibility:   +10
Rain + indoor:   +15
Points value:    +0–10 (capped)
Max score:       100
```

Missing: distance weighting, time-of-day, opening hours, user preference trends.

---

## Route Algorithm (current)

Located in `backend/src/services/routeService.js`:

- Nearest-neighbor greedy heuristic
- Fixed walking speed: 4.5 km/h
- Stops when `totalTime >= timeBudget`
- Filters by category, accessibility level, indoor preference before building

Missing: walking pace as input, real-time re-routing, "skip this landmark" mid-route.

---

## Gamification State

- Points accumulate on landmark visits (in Zustand + DB)
- Collection screen shows visited landmarks
- **No badges, achievements, streaks, or leaderboard implemented**

---

## Priority Order for Remaining ~13 Days

1. **Supabase setup + Dublin landmark seed data** — unblocks everything
2. **Auth flow** — login/register screens using Supabase Auth
3. **RouteBuilderScreen UI** — time budget slider, category chips, accessibility toggle, API call
4. **Walking pace input** — self-reported slider or GPS-derived from device
5. **Battery + time-of-day signals** — add to backend scoring/filtering
6. **Active route map view** — follow the generated route on the map
7. **Badges / achievements** — first visit, 5 in a day, etc.
8. **Unit + integration tests** — Week 4 milestone
9. **HomeScreen stats + weather widget**

---

## Key File Locations

```
mobile/src/screens/          — All app screens
mobile/src/components/       — Common/, Landmark/, Map/
mobile/src/store/useStore.js — Zustand global state
mobile/src/hooks/            — useLocation, useWeather, useLandmarks
backend/src/services/        — routeService, recommendationService, weatherService
backend/src/controllers/     — Route handlers
backend/src/routes/          — Express route definitions
database/                    — SQL migrations and seed data
docs/                        — Architecture, API, DB schema, timeline
```

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| RouteBuilderScreen not built by Week 4 | Core feature missing for demo | Build it next — it's the most important screen |
| No landmark data | Nothing to show | Seed Dublin landmarks early this week |
| Walking pace never implemented | "Adaptive" claim is weak | At minimum add a self-reported pace setting |
| No tests before deadline | Fails Week 4 milestone | Write tests in parallel with last features |
