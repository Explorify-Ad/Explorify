# 🧭 Architectural Decision Records

## ADR-001: React Native with Expo

**Date:** 2026-03-01

**Status:** Accepted

**Context:** We need a cross-platform mobile framework for a 1-month project.

**Decision:** Use React Native with Expo managed workflow.

**Rationale:**
- Cross-platform (iOS + Android) from single codebase
- Expo provides built-in APIs for location, maps, and sensors
- Fast development cycle with hot reload
- Rich ecosystem of pre-built components
- Team familiarity with JavaScript/React

**Consequences:**
- Limited access to some native modules (mitigated by Expo SDK)
- Larger app bundle size compared to native

---

## ADR-002: Supabase for Database and Auth

**Date:** 2026-03-01

**Status:** Accepted

**Context:** We need a database hosting solution with authentication.

**Decision:** Use Supabase for PostgreSQL hosting and user authentication.

**Rationale:**
- Generous free tier suitable for academic project
- Built-in authentication (email, OAuth)
- PostgreSQL with full SQL support
- Real-time subscriptions available
- Easy-to-use dashboard and API

**Consequences:**
- Vendor dependency for auth and database
- Rate limits on free tier

---

## ADR-003: Zustand for State Management

**Date:** 2026-03-01

**Status:** Accepted

**Context:** We need a state management solution for the mobile app.

**Decision:** Use Zustand instead of Redux or Context API.

**Rationale:**
- Minimal boilerplate compared to Redux
- No provider wrapping needed
- Simple, intuitive API
- Small bundle size
- Built-in persistence support

**Consequences:**
- Less structured than Redux (mitigated with conventions)
- Smaller community than Redux

---

## ADR-004: Monorepo Structure

**Date:** 2026-03-01

**Status:** Accepted

**Context:** We need to organize frontend and backend code.

**Decision:** Use a monorepo with npm workspaces.

**Rationale:**
- Single repository for easier project management
- Shared configuration and tooling
- Simplified CI/CD pipeline
- Better code review process
- Suitable for small team (3 members)

**Consequences:**
- Larger repository size
- Need to manage separate dependency trees

---

## ADR-005: Express.js for Backend API

**Date:** 2026-03-01

**Status:** Accepted

**Context:** We need a backend framework for the REST API.

**Decision:** Use Express.js with Node.js.

**Rationale:**
- Lightweight and unopinionated
- Large middleware ecosystem
- Team familiarity with JavaScript
- Easy to deploy on Render.com
- Extensive documentation and community support

**Consequences:**
- Manual setup for many features (mitigated by middleware)
- No built-in ORM (using raw pg queries for simplicity)
