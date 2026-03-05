# 🏗️ Architecture Overview

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    Mobile App                        │
│              (React Native / Expo)                   │
│                                                     │
│  ┌───────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  Screens  │ │  Store   │ │    Services       │  │
│  │           │ │ (Zustand)│ │ (API, Location,   │  │
│  │           │ │          │ │  Weather, Storage) │  │
│  └─────┬─────┘ └────┬─────┘ └────────┬──────────┘  │
│        │             │                │              │
└────────┼─────────────┼────────────────┼──────────────┘
         │             │                │
         └─────────────┼────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │       Backend API           │
         │    (Node.js / Express)      │
         │                             │
         │  ┌──────────┐ ┌──────────┐  │
         │  │  Routes   │ │Middleware│  │
         │  │Controllers│ │  Auth    │  │
         │  └─────┬─────┘ └────┬────┘  │
         │        │             │       │
         │  ┌─────┴─────────────┴────┐  │
         │  │      Services          │  │
         │  │  (Route, Recommend,    │  │
         │  │   Weather)             │  │
         │  └──────────┬─────────────┘  │
         └─────────────┼────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
  ┌───────────────────┐ ┌──────────────────┐
  │   PostgreSQL      │ │  External APIs   │
  │   (Supabase)      │ │  - OpenWeather   │
  │                   │ │  - Google Maps   │
  └───────────────────┘ └──────────────────┘
```

## Component Interaction Flow

### Route Generation Flow

1. User sets preferences (pace, accessibility, time budget)
2. Mobile app sends request to Backend API
3. Backend queries landmarks from PostgreSQL
4. Route service applies filtering (accessibility, indoor/outdoor, category)
5. Recommendation engine scores and ranks landmarks
6. Route optimizer arranges landmarks by proximity
7. Weather service adjusts for current conditions
8. Optimized route returned to mobile app
9. Mobile app displays route on map

### Data Flow

```
User Input → Zustand Store → API Service → Express Router
    → Controller → Service Layer → Database Query
    → Response → Zustand Store → UI Update
```

## Technology Choices

| Technology | Rationale |
|-----------|-----------|
| **React Native (Expo)** | Cross-platform development, rapid prototyping, rich ecosystem |
| **Express.js** | Lightweight, flexible, large middleware ecosystem |
| **PostgreSQL** | Robust relational DB, JSONB support for flexible data |
| **Supabase** | Free tier, built-in auth, real-time capabilities, PostgreSQL hosting |
| **Zustand** | Minimal boilerplate, simple API, no provider wrapping needed |
| **React Native Maps** | Native map performance, supports both Google Maps and Apple Maps |

## Security Architecture

- Supabase Auth handles user authentication (JWT tokens)
- Backend validates tokens on protected routes via auth middleware
- Environment variables store all secrets (never committed to repo)
- CORS configured to accept only known origins
- Input validation on all API endpoints via express-validator
