# 🚀 Deployment Guide

## Architecture

```
Mobile App (Expo) → Backend API (Render.com) → Database (Supabase)
```

## Backend Deployment (Render.com)

### Prerequisites
- [Render.com](https://render.com) account
- Backend code pushed to GitHub

### Steps

1. **Create a new Web Service** on Render.com
2. **Connect your GitHub repo** and select the `backend` directory
3. **Configure the service:**
   - **Name:** explorify-api
   - **Root Directory:** backend
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node Version:** 18

4. **Set environment variables** in the Render dashboard:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DATABASE_URL=your-supabase-connection-string`
   - `SUPABASE_URL=your-supabase-url`
   - `SUPABASE_ANON_KEY=your-supabase-anon-key`
   - `SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key`
   - `OPENWEATHERMAP_API_KEY=your-api-key`
   - `JWT_SECRET=your-jwt-secret`

5. **Deploy** and verify at `https://your-app.onrender.com/api/health`

## Database (Supabase)

### Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Run `database/schema.sql`
4. Run `database/seeds/dublin_landmarks.sql`
5. Copy connection details to your `.env` files

### Configuration

- Enable **Row Level Security (RLS)** on all tables
- Set up **auth policies** for user data access
- Configure **database backups** (automatic on paid plans)

## Mobile App (Expo)

### Development Build

```bash
cd mobile
expo build:android  # Android APK
expo build:ios      # iOS build (requires Apple Developer account)
```

### Environment

Update `mobile/.env` for production:

```
EXPO_PUBLIC_API_URL=https://your-app.onrender.com/api
```

## Post-Deployment Checklist

- [ ] Backend health check responds at `/api/health`
- [ ] Database connection is working
- [ ] Landmarks are loading from database
- [ ] Authentication flow works
- [ ] Environment variables are all set
- [ ] CORS is configured for production origins
- [ ] Error logging is working
