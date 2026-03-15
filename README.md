# 🌍 Explorify - Adaptive Tourism Gamification Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Explorify-Ad/Explorify/actions/workflows/ci.yml/badge.svg)](https://github.com/Explorify-Ad/Explorify/actions/workflows/ci.yml)

**Explorify** is a location-based tourism platform that adapts routes based on user walking pace, accessibility needs, and environmental conditions. Built as an academic project, it gamifies the exploration of Dublin's landmarks with smart routing, universal accessibility, and contextual safety features.

---

## ✨ Key Features

| Pillar | Description |
|--------|-------------|
| 🗺️ **Smart Route Builder** | Dynamically generates walking routes based on user preferences, pace, and available time |
| ♿ **Universal Access Mode** | Adapts routes for users with mobility, visual, or hearing accessibility needs |
| 🛡️ **Contextual Safety System** | Adjusts recommendations based on weather, time of day, and device battery level |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile** | React Native 0.81.5 + Expo SDK 54 |
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | Supabase Auth |
| **Maps** | TomTom Maps Web SDK v6 (via WebView) |
| **Location Search** | TomTom Search API v2 |
| **GPS** | expo-location |
| **Weather API** | OpenWeatherMap |
| **State Management** | React Context (theme) |
| **Hosting** | Render.com (backend), Supabase (database) |

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Expo CLI (`npm install -g expo-cli`)
- PostgreSQL (or Supabase account)

### Installation

```bash
# Clone the repository
git clone https://github.com/Explorify-Ad/Explorify.git
cd Explorify

# Install all dependencies (npm workspaces — run from root)
npm install

# Copy environment variables
cp mobile/.env.example mobile/.env
cp backend/.env.example backend/.env
```

Edit `mobile/.env` and add your API keys:

```env
EXPO_PUBLIC_TOMTOM_API_KEY=your_tomtom_api_key   # developer.tomtom.com (free tier)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Running the App

```bash
# Start the mobile app (Expo dev server)
npm run mobile
# Then scan the QR code with Expo Go (SDK 54) on your device

# Start the backend server
npm run backend
```

> **Note:** Install [Expo Go](https://expo.dev/client) on your device. Use **Expo Go** to scan the QR — not the native iOS camera app. For cross-network access use `npx expo start --tunnel` from `mobile/`.

## 📁 Project Structure

```
explorify/
├── .github/          # GitHub Actions, issue & PR templates
├── mobile/           # React Native Expo app
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── screens/      # App screens
│   │   ├── navigation/   # Navigation setup
│   │   ├── services/     # API & external services
│   │   ├── store/        # Zustand state management
│   │   ├── utils/        # Utility functions
│   │   └── hooks/        # Custom React hooks
│   └── assets/           # Images, fonts, icons
├── backend/          # Node.js Express API
│   ├── src/
│   │   ├── config/       # Database & service configs
│   │   ├── controllers/  # Route controllers
│   │   ├── routes/       # API route definitions
│   │   ├── middleware/    # Auth, validation, errors
│   │   ├── models/       # Data models
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utility functions
│   └── tests/            # Unit & integration tests
├── database/         # SQL migrations & seed data
├── docs/             # Project documentation
└── scripts/          # Utility scripts
```

## 📖 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Development Setup](docs/SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)
- [Database Schema](docs/DATABASE.md)
- [Project Timeline](docs/TIMELINE.md)
- [Architectural Decisions](docs/DECISIONS.md)

## 👥 Team

| Name | Role | GitHub |
|------|------|--------|
| Team Member 1 | Frontend Developer | [@member1](https://github.com/member1) |
| Team Member 2 | Backend Developer | [@member2](https://github.com/member2) |
| Team Member 3 | Full Stack Developer | [@member3](https://github.com/member3) |

## 📸 Screenshots

> Screenshots will be added as the app is developed.

| Home Screen | Map View | Route Builder |
|-------------|----------|---------------|
| *Coming soon* | *Coming soon* | *Coming soon* |

## 🤝 Contributing

Please read our [Contributing Guidelines](docs/CONTRIBUTING.md) before submitting a pull request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
