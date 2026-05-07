<div align="center">

# 🌍 Explorify

### Adaptive Tourism Gamification Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Explorify-Ad/Explorify/actions/workflows/ci.yml/badge.svg)](https://github.com/Explorify-Ad/Explorify/actions/workflows/ci.yml)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)

**Explorify** is a location-based tourism platform that adapts walking routes in real time based on your pace, accessibility needs, exploration DNA, and live environmental conditions. Built as an academic project at Trinity College Dublin, it gamifies the discovery of Dublin's landmarks with smart routing, social expeditions, and contextual safety features.

</div>

---

## 📸 Screenshots

<div align="center">

| 🗺️ Live Map (3D) | 🧭 Route Builder | 👤 Profile & DNA |
|:-:|:-:|:-:|
| <img src="images /map.jpeg" width="220"/> | <img src="images /route.jpeg" width="220"/> | <img src="images /profile.jpeg" width="220"/> |

| 🏆 Quests | 📦 Collection | 🔋 Battery Awareness |
|:-:|:-:|:-:|
| <img src="images /quests.jpeg" width="220"/> | <img src="images /collection.jpeg" width="220"/> | <img src="images /batterylevel.jpeg" width="220"/> |

</div>

---

## ✨ Features

### 🗺️ Smart Map (TomTom 3D)
- Real-time 3D map with pitched perspective, drag-rotate and building extrusions
- Landmark markers colour-coded by **tier**: 🟡 Public · 🩵 Discovered · 🟣 Hidden
- **Expedition markers** — pulsing coral rings showing live active group explorations
- Battery warning banner when device drops below 20%
- Automatic fallback to TCD Dublin coordinates if GPS is unavailable

### 🧭 Adaptive Route Builder
- Generates personalised walking routes based on available time, interests and pace
- **13 adaptive features** running simultaneously (see [Adaptive Engine](#-adaptive-engine) below)
- Transparent "Why this route?" panel explaining every active adaptation
- Per-waypoint reason chips (e.g. "🌧️ Rainy Day Pick", "🎯 Matches Your Interests")
- Integrated TomTom turn-by-turn route overlay on the live map

### 🧬 Exploration DNA
- Radar chart (8 axes) on your Profile, computed from real check-in history
- DNA match % shown for every expedition — how well it fits your exploration style
- Drives `dna_only` expedition gating — some expeditions are DNA-matched entry only

### 🏆 Quests & Gamification
- 6 thematic quests: Heritage Trail · Street Food Safari · Through the Ages · Art Discovery · Into the Wild · After Dark
- Active quest progress strip pinned to the map
- XP awarded per tier on check-in: Public 150 · Discovered 320 · Hidden 600
- Achievements and badges unlocked by real exploration milestones
- Streak tracking and leaderboard-ready `total_points`

### 🚀 Expeditions (Social Exploration)
- Create real-time group explorations with title, categories, meeting point, group size and duration
- **DNA-only toggle** — restrict joiners to users whose exploration DNA matches
- Live group chat with `text`, `check_in`, `vote` and `system` message types
- Pulsing expedition markers on the map — tap to preview and join
- Realtime via Supabase `postgres_changes` subscriptions

### 📦 Collection
- Full check-in history with tier, category, XP earned and dwell time
- Proximity gating: must be ≤100m from a landmark to check in
- Saved to Supabase `collections` and synced to local Zustand store

### ♿ Universal Accessibility
- Accessibility level (1–5) on every landmark
- Route engine soft-filters by user-declared `accessibility_needs` score
- Adapts route for mobility, visual or hearing needs

### 🛡️ Contextual Safety
- Battery-aware routing: caps time budget at 60 min (<20%) or 30 min (<10%)
- Weather adaptation: forces indoor venues in heavy rain, boosts sheltered spots when cold/windy
- Time-of-day adaptation: morning boosts nature/food, evening boosts architecture/nightlife

---

## 🧠 Adaptive Engine

Explorify runs **13 simultaneous adaptive features** on every route generation:

| # | Feature | Weight | Description |
|---|---------|--------|-------------|
| 1 | **Walking Pace Learning** | 15% | Learns your km/h from GPS samples; adjusts how many stops fit your time budget |
| 2 | **Dwell Time Learning** | 12% | Per-category average visit time learned from your check-in history |
| 3 | **Cold Start Onboarding** | 9% | Bootstraps personalisation from your interests + visitor type for new users |
| 4 | **Time-of-Day** | 14% | Morning→nature/food · Midday→museums/art · Evening→architecture/nightlife |
| 5 | **Interest Decay / Novelty Bonus** | 12% | Boosts under-explored categories to prevent repetition |
| 6 | **Visitor Type (Tourist vs Local)** | 7% | Tourist→popular/accessible · Local→obscure/high-value |
| 7 | **Weather Adaptation** | 8% | Rain→indoor · Cold+windy→sheltered · Clear→outdoor/scenic |
| 8 | **Battery-Aware Routing** | — | Caps route duration when battery is low |
| 9 | **Accessibility Adaptation** | — | Filters landmarks by declared accessibility needs |
| 10 | **Adaptive Difficulty (Tier Unlock)** | 4% | 0–499 XP: public only · 500–1999: discovered · 2000+: hidden |
| 11 | **Repeat-Visit Avoidance** | — | −0.25 score penalty on already-visited landmarks |
| 12 | **Group Context** | — | "Who are you exploring with?" adjusts pace and category weights |
| 13 | **Scrutability** | — | Every decision surfaced to the user via chips, panels and profile cards |

---

## 🏗️ Architecture

<div align="center">
<img src="images /Explorify TA.drawio.png" width="800"/>
</div>

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile** | React Native 0.81.5 + Expo SDK 54 |
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth (email/password, session via AsyncStorage) |
| **Maps** | TomTom Maps Web SDK v6 (WebView + `tt.map`) |
| **Routing** | TomTom Search API v2 + custom scoring engine |
| **GPS** | `expo-location` |
| **Weather** | OpenWeatherMap API |
| **State** | Zustand (mobile) |
| **Realtime** | Supabase `postgres_changes` |
| **Hosting** | Render.com (backend) · Supabase (DB + Auth) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18.x · npm ≥ 9.x
- [Expo Go](https://expo.dev/client) on your device (SDK 54)
- Supabase account · TomTom Developer account (free tier)

### Installation

```bash
git clone https://github.com/Explorify-Ad/Explorify.git
cd Explorify
npm install

cp mobile/.env.example mobile/.env
cp backend/.env.example backend/.env
```

Edit `mobile/.env`:

```env
EXPO_PUBLIC_TOMTOM_API_KEY=your_tomtom_api_key
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENWEATHER_API_KEY=your-openweather-key
```

### Run

```bash
# Mobile (Expo dev server)
npm run mobile
# Scan the QR with Expo Go — or use --tunnel for cross-network

# Backend
npm run backend
```

### Database Setup

Run migrations in order in **Supabase SQL Editor**:

```
database/migrations/001_create_users.sql
database/migrations/002_create_landmarks.sql
database/migrations/003_create_collections.sql
database/migrations/004_create_routes.sql
database/migrations/005_create_expeditions.sql
database/migrations/006_adaptive_features.sql
database/migrations/007_add_ended_status.sql
database/migrations/011_unified_features.sql
```

Then seed Dublin landmarks:

```
database/seeds/dublin_landmarks.sql
database/seeds/001_test_data.sql      ← requires 4 auth users (see file header)
database/seeds/003_dna_match_demo.sql ← 3 demo expeditions with DNA match scores
```

---

## 🧪 Test Users

| User | Email | Password | XP | Visitor Type |
|------|-------|----------|----|--------------|
| Alice Chen | alice@explorify.test | TestPass123! | 1,850 | Tourist |
| Marco Walsh | marco@explorify.test | TestPass123! | 2,600 | Local |
| Sophie Kim | sophie@explorify.test | TestPass123! | 0 | Tourist (new user) |
| Dev Admin | dev@explorify.test | TestPass123! | 5,000 | Local |

Create these in **Supabase Dashboard → Authentication → Add User** before running the seed.

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `landmarks` | All Dublin POIs — category, tier, accessibility, coordinates, tags |
| `collections` | User check-in history — XP earned, dwell time, rating |
| `expeditions` | Active social explorations — categories, DNA-only flag, meeting point |
| `expedition_members` | Who has joined each expedition |
| `messages` | Real-time chat — expedition group chat + DMs + community channels |
| `communities` | Named explorer communities (Dublin Heritage, Culinary Trailblazers…) |
| `community_channels` | Text rooms within communities |
| `user_profiles` | Supabase-side profile — interests, visitor type, display name |
| `users` | Backend profile — total_points, walking pace, preferences |
| `routes` | Saved generated routes |

---

## 📁 Project Structure

```
explorify/
├── mobile/                   # React Native Expo app
│   └── src/
│       ├── screens/          # MapScreen, RouteBuilder, Profile, Expedition…
│       ├── components/       # TomTomMap, TopHUD, ChatBubbles, Markers…
│       ├── services/         # supabase.js, tomtom.js, weather.js, location.js
│       ├── store/            # Zustand store (useStore.js)
│       ├── hooks/            # useBattery, useWeather
│       └── utils/            # recommendations.js, scoring helpers
├── backend/                  # Node.js Express API
│   └── src/
│       ├── controllers/      # landmark, route, expedition, collection…
│       ├── routes/           # REST endpoint definitions
│       ├── services/         # routeService.js (13 adaptive features)
│       └── middleware/       # auth.js, error handling
├── database/
│   ├── migrations/           # 001–011 SQL migrations
│   └── seeds/                # Dublin landmarks + test data + DNA demo
├── docs/                     # Architecture, API, Setup, Decisions…
└── images /                  # App screenshots & architecture diagram
```

---

## 📖 Documentation

| Doc | Link |
|-----|------|
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| API Reference | [docs/API.md](docs/API.md) |
| Database Schema | [docs/DATABASE.md](docs/DATABASE.md) |
| Dev Setup | [docs/SETUP.md](docs/SETUP.md) |
| Deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Feature Tracker | [FEATURES.md](FEATURES.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |
| Contributing | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |
| Decisions | [docs/DECISIONS.md](docs/DECISIONS.md) |

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
