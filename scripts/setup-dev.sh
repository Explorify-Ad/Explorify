#!/bin/bash

# ===========================================
# Explorify - Development Environment Setup
# ===========================================

set -e

echo "🌍 Explorify Development Setup"
echo "================================"

# Check Node.js version
echo ""
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js >= 18.x"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js version must be >= 18.x (current: $(node -v))"
  exit 1
fi
echo "✅ Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
  echo "❌ npm is not installed"
  exit 1
fi
echo "✅ npm $(npm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
cd mobile && npm install && cd ..
cd backend && npm install && cd ..
echo "✅ Dependencies installed"

# Copy .env files
echo ""
echo "🔧 Setting up environment files..."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from template"
else
  echo "⏭️  .env already exists, skipping"
fi

if [ ! -f mobile/.env ]; then
  cp mobile/.env.example mobile/.env
  echo "✅ Created mobile/.env from template"
else
  echo "⏭️  mobile/.env already exists, skipping"
fi

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "✅ Created backend/.env from template"
else
  echo "⏭️  backend/.env already exists, skipping"
fi

echo ""
echo "================================"
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env files with your API keys"
echo "  2. Set up your Supabase project"
echo "  3. Run database migrations (see scripts/seed-db.sh)"
echo "  4. Start the backend: npm run backend"
echo "  5. Start the mobile app: npm run mobile"
echo ""
