#!/bin/bash

# ===========================================
# Explorify - Deployment Script
# ===========================================

set -e

echo "🚀 Explorify Deployment"
echo "================================"

ENVIRONMENT=${1:-production}
echo "Environment: $ENVIRONMENT"

# Backend deployment
echo ""
echo "📦 Deploying backend..."
cd backend

echo "  Running tests..."
npm test || { echo "❌ Tests failed. Aborting deployment."; exit 1; }

echo "  ✅ Tests passed"
echo "  💡 Deploy to Render.com via Git push or Render dashboard"

cd ..

echo ""
echo "📱 Mobile build..."
cd mobile

echo "  💡 Build with: expo build:android / expo build:ios"
echo "  💡 Or use EAS Build: eas build --platform all"

cd ..

echo ""
echo "================================"
echo "🎉 Deployment steps complete!"
echo ""
echo "Manual steps remaining:"
echo "  1. Push to main branch for Render.com auto-deploy"
echo "  2. Build mobile app with Expo/EAS"
echo "  3. Verify health check: curl https://your-app.onrender.com/api/health"
