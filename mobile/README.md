# Explorify Mobile App

React Native (Expo SDK 54) mobile application for the Explorify platform.

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- [Expo Go](https://expo.dev/client) app installed on your iOS/Android device (SDK 54)
- TomTom API key — get one free at [developer.tomtom.com](https://developer.tomtom.com)

## Installation

Run from the **workspace root** (`Explorify/`), not from `mobile/` directly — the project uses npm workspaces.

```bash
# From workspace root
npm install

# Copy and fill in environment variables
cp mobile/.env.example mobile/.env
```

Edit `mobile/.env` and set your keys:

```env
EXPO_PUBLIC_TOMTOM_API_KEY=your_tomtom_api_key
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Running

```bash
# From workspace root — starts Expo dev server
npm run mobile

# Or from the mobile/ directory directly
cd mobile
npx expo start

# Scan the QR code with Expo Go on your device
# For cross-network access (different WiFi):
npx expo start --tunnel
```

> **Important:** Use the **Expo Go** app to scan the QR code, not the native iOS camera app. The native camera cannot open `exp://` URLs.

## Project Structure

```
mobile/
├── src/
│   ├── components/
│   │   └── explorify/
│   │       ├── TopHUD.js        # XP bar, level badge, streak counter
│   │       ├── Buttons.js       # PrimaryAction, SecondaryAction, FAB
│   │       ├── Badges.js        # TierBadge, CategoryPill, XPChip, LevelBadge
│   │       ├── MapMarkers.js    # PublicMarker, DiscoveredMarker, HiddenMarker
│   │       └── TomTomMap.js     # WebView wrapper for TomTom Maps Web SDK
│   ├── screens/
│   │   ├── OnboardingScreen.js  # Interest selection
│   │   ├── MapScreen.js         # Live TomTom map + nearby POIs
│   │   ├── NearbyScreen.js      # Radius-filtered POI list
│   │   ├── LandmarkDetailScreen.js  # POI detail + GPS check-in
│   │   ├── QuestsScreen.js      # Active & suggested quests
│   │   ├── CollectionScreen.js  # Collected landmarks grid
│   │   └── ProfileScreen.js     # Stats, radar chart, achievements
│   ├── navigation/
│   │   └── AppNavigator.js      # Stack + bottom tab navigator
│   ├── services/
│   │   ├── tomtom.js            # TomTom Search API (nearbySearch, haversineDistance)
│   │   ├── location.js          # expo-location helpers
│   │   ├── supabase.js          # Supabase client
│   │   └── api.js               # Backend REST client
│   ├── context/
│   │   └── ThemeContext.js      # 4-mode theme (exploration/discovery/quest/expedition)
│   └── utils/
│       └── theme.js             # Theme objects, TIER_COLORS, CATEGORY_COLORS
└── assets/
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `expo` ~54 | React Native development platform |
| `react-native` 0.81.5 | Core framework |
| `@react-navigation/native` v6 | Navigation |
| `@react-navigation/stack` v6 | Stack navigator |
| `@react-navigation/bottom-tabs` v6 | Tab bar |
| `react-native-webview` | Renders TomTom Maps Web SDK |
| `react-native-svg` | SVG radar chart on Profile screen |
| `expo-location` | GPS access for map + check-in |
| `react-native-safe-area-context` | Safe area insets (notch/home bar) |
| `lucide-react-native` | Icons (requires `react-native-svg`) |

## Map Architecture

The live map uses the **TomTom Maps Web SDK v6** loaded inside a `react-native-webview`. This approach works in Expo Go without requiring a custom native build (unlike `react-native-maps`).

- `TomTomMap.js` renders an HTML page with the TomTom JS SDK
- `tomtom.js` service calls the **TomTom Search API v2** (`/nearbySearch`) to fetch real POIs
- Marker taps send a `postMessage` from the WebView back to React Native
- `LandmarkDetailScreen` uses `expo-location` + Haversine distance for live GPS proximity tracking and the 100m check-in radius

## Theme Modes

The app switches theme automatically based on context:

| Mode | Primary colour | Triggered by |
|------|---------------|--------------|
| `exploration` | Amber `#F5A623` | Default / Map tab |
| `discovery` | Teal `#00C9B1` | Opening a landmark |
| `quest` | Purple `#7C3AED` | Quests tab |
| `expedition` | Coral `#FF6B6B` | Active expedition |

## Known Issues / Notes

- **Expo Go only:** The app is designed to run in Expo Go SDK 54. A custom dev build is required to use `react-native-maps` or background location.
- **npm workspaces:** Always install packages from the workspace root or use `npx expo install` from `mobile/`. Running `npm install` inside `mobile/` alone can cause version conflicts with the hoisted `node_modules`.
- **TomTom free tier:** The free API key supports 2,500 daily requests. The Nearby Search is called once on map load and once per radius change in the Nearby screen.
