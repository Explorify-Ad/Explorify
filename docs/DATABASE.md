# 🗄️ Database Schema & Relationships

## Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    users     │     │   collections    │     │  landmarks   │
├──────────────┤     ├──────────────────┤     ├──────────────┤
│ id (PK)      │────<│ user_id (FK)     │>────│ id (PK)      │
│ email        │     │ landmark_id (FK) │     │ name         │
│ display_name │     │ visited_at       │     │ latitude     │
│ preferences  │     │ dwell_time_min   │     │ longitude    │
│ accessibility│     │ rating           │     │ category     │
│ total_points │     │ notes            │     │ accessibility│
│ created_at   │     └──────────────────┘     │ is_indoor    │
│ updated_at   │                               │ description  │
└──────┬───────┘                               │ points       │
       │                                       │ avg_visit_dur│
       │         ┌──────────────┐              └──────────────┘
       └────────<│    routes    │
                 ├──────────────┤
                 │ id (PK)      │
                 │ user_id (FK) │
                 │ name         │
                 │ landmarks    │
                 │ distance_km  │
                 │ duration_min │
                 │ is_completed │
                 │ created_at   │
                 │ completed_at │
                 └──────────────┘
```

## Tables

### users

Stores user profiles and preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| display_name | VARCHAR(100) | | Display name |
| preferences | JSONB | DEFAULT '{}' | User preferences (pace, categories, etc.) |
| accessibility_needs | INT | CHECK (0-5) | Accessibility requirement level |
| total_points | INT | DEFAULT 0 | Accumulated gamification points |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

### landmarks

Stores Dublin landmark information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Landmark name |
| latitude | DECIMAL(10,8) | NOT NULL | GPS latitude |
| longitude | DECIMAL(11,8) | NOT NULL | GPS longitude |
| category | VARCHAR(50) | NOT NULL, CHECK | Category (historical, cultural, etc.) |
| accessibility_level | INT | NOT NULL, CHECK (1-5) | Accessibility rating |
| is_indoor | BOOLEAN | DEFAULT false | Indoor or outdoor |
| description | TEXT | | Detailed description |
| image_url | VARCHAR(500) | | Image URL |
| points | INT | DEFAULT 10 | Points awarded for visiting |
| avg_visit_duration_min | INT | DEFAULT 30 | Average visit time in minutes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

### collections

Tracks which landmarks a user has visited.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | FK → users, NOT NULL | Reference to user |
| landmark_id | UUID | FK → landmarks, NOT NULL | Reference to landmark |
| visited_at | TIMESTAMPTZ | DEFAULT NOW() | Visit timestamp |
| dwell_time_min | INT | | Time spent at landmark |
| rating | INT | CHECK (1-5) | User rating |
| notes | TEXT | | User notes |
| | | UNIQUE(user_id, landmark_id) | One visit record per landmark |

### routes

Stores generated walking routes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | FK → users, NOT NULL | Route creator |
| name | VARCHAR(255) | | Route name |
| landmarks | JSONB | NOT NULL, DEFAULT '[]' | Ordered list of landmarks |
| total_distance_km | DECIMAL(6,2) | | Total route distance |
| estimated_duration_min | INT | | Estimated walking time |
| is_completed | BOOLEAN | DEFAULT false | Route completion status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| completed_at | TIMESTAMPTZ | | Completion timestamp |

## Indexes

| Table | Index | Columns |
|-------|-------|---------|
| users | idx_users_email | email |
| landmarks | idx_landmarks_category | category |
| landmarks | idx_landmarks_accessibility | accessibility_level |
| landmarks | idx_landmarks_location | latitude, longitude |
| collections | idx_collections_user_id | user_id |
| collections | idx_collections_landmark_id | landmark_id |
| routes | idx_routes_user_id | user_id |
