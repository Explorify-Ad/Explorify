# Explorify Manual Test Plan

This document outlines robust manual testing procedures to verify the application's complex behavior.

## Setup Requirements
1. Ensure the `mobile` and `backend` services are running.
2. Have a test account registered and logged in via the mobile app.
3. Keep the Supabase console open alongside the app.

---

## 🏎️ Use Case 1: The "New Explorer" Journey
**Objective**: Verify that a completely new user gets appropriate introductory constraints.

1. **Onboarding**: Select `Tourist` profile, and `Food` + `History` interests.
2. **Profile Screen**: 
   - Verify `Adaptive Persona` is enabled.
   - Verify the "Why" section says `NEW EXPLORER: Yes`.
3. **Map/Route Builder**:
   - Generate a route.
   - Expand `Why this route?`
   - **Expect**: Easy/Public tier landmarks (Points < 15), matching `Food` and `History` first. No punishment for "popular".
4. **Check in**: Tap a landmark -> Check In -> Rate 5 stars.
   - **Expect**: Collection logs the entry. XP increases. Profile DNA chart updates to show a spike in the checked-in category.

---

## 👥 Use Case 2: The "Social Expedition" (Feature 230)
**Objective**: Test group consensus logic and live chat.

1. **Create Group**: `Profile` -> `Expeditions` -> Create new `Food Group`.
2. **Invite Other User**: Have another test phone/emulator join via the group tab.
3. **Group Preferences (Adaptive Engine)**:
   - User A has `Fast Walker`, `Tourist`.
   - User B has `Slow Walker`, `Local`.
   - **Action**: Generate Route from Group context.
   - **Expect**: The backend should blend the speeds and output moderate length routes, targeting highly-rated spots.
4. **Group Chat**: Expand chat drawer.
   - **Action**: Type a message as User A.
   - **Expect**: Immediate appearance on User B's screen via Supabase realtime.

---

## ☁️ Use Case 3: Environmental Adaptation (Feature 13)
**Objective**: Ensure the backend reacts to dynamic changes.

1. **Default State**: Weather returns `clear`. Route prioritizes outdoor spots.
2. **Simulate Rain**: 
   - Temporarily change `getFallbackWeather()` in `backend/src/services/weatherService.js` to return `isRaining: true`.
   - Restart the backend.
3. **Generate Route**:
   - Expand `Why this route?`
   - **Expect**: "Rainy Day Pick" reason exists. The route should heavily favor landmarks with `is_indoor: true`.
4. **Simulate Low Battery**:
   - In profile preferences, mock battery level to 10%.
   - **Generate Route**.
   - **Expect**: Route duration caps at 30 minutes, minimizing travel distance.
