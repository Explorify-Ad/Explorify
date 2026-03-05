# 📡 API Documentation

## Base URL

```
Development: http://localhost:3000/api
Production: https://explorify-api.onrender.com/api
```

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### Health Check

#### `GET /api/health`

Check if the API server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T12:00:00.000Z",
  "uptime": 3600
}
```

---

### Landmarks

#### `GET /api/landmarks`

Get all landmarks with optional filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category (historical, cultural, nature, etc.) |
| `accessibility` | number | Minimum accessibility level (1-5) |
| `indoor` | boolean | Filter indoor/outdoor landmarks |
| `limit` | number | Number of results (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Trinity College Dublin",
      "latitude": 53.3440,
      "longitude": -6.2545,
      "category": "historical",
      "accessibility_level": 5,
      "is_indoor": false,
      "description": "Ireland's oldest university...",
      "points": 20,
      "avg_visit_duration_min": 60
    }
  ],
  "total": 20,
  "limit": 50,
  "offset": 0
}
```

#### `GET /api/landmarks/:id`

Get a single landmark by ID.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Trinity College Dublin",
    "latitude": 53.3440,
    "longitude": -6.2545,
    "category": "historical",
    "accessibility_level": 5,
    "is_indoor": false,
    "description": "Ireland's oldest university...",
    "points": 20,
    "avg_visit_duration_min": 60
  }
}
```

---

### Routes

#### `POST /api/routes` 🔒

Generate an optimized route.

**Request Body:**
```json
{
  "start_lat": 53.3498,
  "start_lng": -6.2603,
  "time_budget_min": 120,
  "preferences": {
    "categories": ["historical", "cultural"],
    "accessibility_min": 3,
    "indoor_only": false,
    "pace": "moderate"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "landmarks": [
      {
        "id": "uuid",
        "name": "GPO",
        "order": 1,
        "estimated_arrival_min": 0
      },
      {
        "id": "uuid",
        "name": "Trinity College Dublin",
        "order": 2,
        "estimated_arrival_min": 15
      }
    ],
    "total_distance_km": 3.2,
    "estimated_duration_min": 95
  }
}
```

#### `GET /api/routes/:id` 🔒

Get a specific route by ID.

---

### Users

#### `GET /api/users/:id` 🔒

Get user profile.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Explorer",
    "preferences": {
      "pace": "moderate",
      "max_distance_km": 5,
      "preferred_categories": ["historical", "cultural"],
      "indoor_preference": "both"
    },
    "accessibility_needs": 0,
    "total_points": 150
  }
}
```

#### `PUT /api/users/:id` 🔒

Update user profile and preferences.

---

### Collections

#### `GET /api/users/:id/collections` 🔒

Get user's visited landmark collection.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "landmark": {
        "id": "uuid",
        "name": "Trinity College Dublin",
        "category": "historical",
        "points": 20
      },
      "visited_at": "2026-03-01T14:30:00.000Z",
      "dwell_time_min": 45,
      "rating": 5
    }
  ],
  "total_points": 150
}
```

#### `POST /api/collections` 🔒

Add a landmark to user's collection (mark as visited).

**Request Body:**
```json
{
  "landmark_id": "uuid",
  "dwell_time_min": 45,
  "rating": 5,
  "notes": "Amazing experience!"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid auth token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 500 | `INTERNAL_ERROR` | Server error |

🔒 = Requires authentication
