# 🔧 Development Setup Guide

## Prerequisites

| Tool | Version | Installation |
|------|---------|-------------|
| Node.js | >= 18.x | [nodejs.org](https://nodejs.org) |
| npm | >= 9.x | Included with Node.js |
| Expo CLI | Latest | `npm install -g expo-cli` |
| Git | Latest | [git-scm.com](https://git-scm.com) |

### Optional

- **Xcode** (macOS only) - For iOS simulator
- **Android Studio** - For Android emulator
- **Expo Go** - Mobile app for testing on physical devices

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Explorify-Ad/Explorify.git
cd Explorify
```

### 2. Install Dependencies

```bash
# Install all project dependencies
npm run install:all
```

### 3. Configure Environment Variables

```bash
# Copy environment templates
cp .env.example .env
cp mobile/.env.example mobile/.env
cp backend/.env.example backend/.env
```

Edit each `.env` file with your credentials:

- **Supabase**: Get keys from [supabase.com](https://supabase.com) dashboard
- **OpenWeatherMap**: Register at [openweathermap.org](https://openweathermap.org/api)
- **Google Maps**: Get API key from [Google Cloud Console](https://console.cloud.google.com)

### 4. Set Up Database

#### Option A: Using Supabase (Recommended)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run `database/schema.sql`
4. Run `database/seeds/dublin_landmarks.sql`

#### Option B: Using Local PostgreSQL

```bash
# Create database
createdb explorify

# Run schema
psql -d explorify -f database/schema.sql

# Seed data
psql -d explorify -f database/seeds/dublin_landmarks.sql
```

### 5. Start the Backend

```bash
cd backend
npm run dev
```

The API server starts at `http://localhost:3000`.

Verify: `curl http://localhost:3000/api/health`

### 6. Start the Mobile App

```bash
cd mobile
npm start
```

This opens the Expo development tools. Use:
- **`i`** to open iOS simulator
- **`a`** to open Android emulator
- **Scan QR code** with Expo Go app on your phone

## Running Tests

```bash
# Backend tests
cd backend && npm test

# Mobile tests
cd mobile && npm test
```

## Troubleshooting

### Common Issues

#### "Module not found" errors

```bash
# Clear caches and reinstall
rm -rf node_modules
rm -rf mobile/node_modules
rm -rf backend/node_modules
npm run install:all
```

#### Expo build errors

```bash
# Clear Expo cache
cd mobile
expo start -c
```

#### Database connection errors

1. Verify `DATABASE_URL` in `backend/.env`
2. Ensure PostgreSQL is running
3. Check that the database exists: `psql -l`

#### Port already in use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

#### Maps not showing

1. Verify Google Maps API key in `mobile/.env`
2. Ensure Maps SDK is enabled in Google Cloud Console
3. For Android, verify key in `mobile/app.json`
