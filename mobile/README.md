# Explorify Mobile App

React Native (Expo) mobile application for the Explorify platform.

## Getting Started

### Prerequisites

- Node.js >= 18.x
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator

### Installation

```bash
npm install
cp .env.example .env
# Fill in your API keys in .env
```

### Running

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── Map/        # Map-related components
│   ├── Landmark/   # Landmark display components
│   └── Common/     # Shared UI elements
├── screens/        # App screens
├── navigation/     # Navigation configuration
├── services/       # API and external service clients
├── store/          # Zustand state management
├── utils/          # Utility functions
└── hooks/          # Custom React hooks
```

## Key Dependencies

- **Expo** - React Native development platform
- **React Navigation** - Screen navigation
- **React Native Maps** - Map display
- **Zustand** - State management
- **Supabase** - Authentication and database
