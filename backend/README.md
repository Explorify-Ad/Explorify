# Explorify Backend API

Node.js Express API server for the Explorify platform.

## Getting Started

### Prerequisites

- Node.js >= 18.x
- PostgreSQL database (or Supabase account)

### Installation

```bash
npm install
cp .env.example .env
# Fill in your database and API credentials in .env
```

### Running

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start

# Run tests
npm test
```

## API Endpoints

See [API Documentation](../docs/API.md) for complete endpoint reference.

### Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/landmarks` | List all landmarks |
| GET | `/api/landmarks/:id` | Get landmark details |
| POST | `/api/routes` | Generate a route |
| GET | `/api/users/:id/collections` | Get user collections |
| POST | `/api/collections` | Add to collection |

## Project Structure

```
src/
├── config/         # Database and service configuration
├── controllers/    # Request handlers
├── routes/         # API route definitions
├── middleware/      # Auth, validation, error handling
├── models/         # Data models
├── services/       # Business logic
└── utils/          # Utility functions
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```
