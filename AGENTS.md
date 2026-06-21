# AGENTS.md - Project Context for LLMs

This document serves as the primary source of truth for any AI agent working on the OCTANE project. It provides the necessary context to maintain consistency in architecture, design, and feature implementation.

**IMPORTANT:** Every agent MUST read this file at the start of a session. Every agent MUST update this file whenever a new feature is added, a page is created, or the architecture is modified.

## 1. Project Overview
**Project Name:** OCTANE
**Purpose:** A high-end, region-based fuel price intelligence and watchlist application.
**Current Status:** Prototype / Initial Frontend.
**Aesthetic:** "Machined Precision" — austere, elite, clinical, monochrome. Inspired by automotive telemetry.

## 2. Tech Stack
- **Framework:** Solid.js (v1.9.13)
- **Language:** TypeScript (v5.9.3)
- **Bundler:** Vite (v7.3.5)
- **Styling:** Tailwind CSS v4 (v4.3.1) using `@tailwindcss/vite` plugin
- **Dev Tools:** solid-devtools (v0.34.5)
- **Backend:** Express.js (v4.22) with TypeScript via tsx
- **Database:** MongoDB Atlas via Mongoose (v8.24)
- **Auth:** bcryptjs (password hashing) + jsonwebtoken (JWT)
- **Font Stack:**
    - Display: Anybody (uppercase, wide tracking)
    - Body: Source Serif 4 (serif, sentence case)
    - Data/Labels: JetBrains Mono (monospace, uppercase)

## 3. Design System (Machined Precision)
**Core Rules:**
- **Canvas:** Pure black (`#000000`) or surface black (`#131313`).
- **Palette:** Monochrome. Pure white (`#ffffff`) for primary, `#cccccc` for body, `#999999` for muted. Single accent: Ice-blue (`#c3d9f3`).
- **Shapes:** Binary. All containers/cards must have `0px` corner radius (`rounded-none`). ONLY interactive buttons/chips use the pill shape (`rounded-full`).
- **Dividers:** 1px hairline borders (`#262626`) or hairline-strong (`#3a3a3a`).
- **Typography Trinity:**
    - `text-headline-xl/lg/md`: Anybody, weight 400, uppercase, wide tracking.
    - `text-body-lg/md`: Source Serif 4, weight 400, sentence case.
    - `text-label-md/sm` and `text-data-lg`: JetBrains Mono, weight 400, uppercase.
- **Weights:** Bold weights are strictly prohibited. All type is weight 400.

## 4. Application Architecture
### Frontend Routing
Implemented as simple signal-based state management in `App.tsx`.
- `currentPage` signal determines which page component is rendered.
- `setCurrentPage` is passed to `TopNav` and `BottomNav` for navigation.

### Backend (server/)
- Express.js server at `server/src/index.ts` on port 3001.
- MongoDB connection via Mongoose using `MONGODB_URI` env variable.
- JWT-based auth with tokens stored in localStorage on the client.

### Project Structure
- `src/App.tsx`: Main entry and routing shell.
- `src/index.css`: Tailwind v4 `@theme` configuration and base styles.
- `src/components/`: Shared UI components (TopNav, BottomNav, etc.).
- `src/pages/`: Page-level components.
- `src/api.ts`: Frontend API utility for backend communication.
- `server/`: Backend Express server.
  - `server/src/index.ts`: Server entry point.
  - `server/src/models/User.ts`: Mongoose User model with bcrypt hashing.
  - `server/src/routes/auth.ts`: Auth routes (POST /api/auth/signin, POST /api/auth/register).
  - `server/src/middleware/auth.ts`: JWT authentication middleware.

### Auth Flow
1. User enters Operator ID and Access Key on `AuthPage`.
2. Frontend calls `POST /api/auth/signin`.
3. Server validates credentials against MongoDB, returns JWT token.
4. Token is stored in localStorage via `src/api.ts` utility.
5. App navigates to Dashboard. Token persists across sessions.

## 5. Current Implementation State
### Pages
- `Landing.tsx`: Marketing entry page with scroll-reveal animations, scroll-driven OCTANE wordmark animation, and feature showcases. Inline nav becomes opaque on scroll. OCTANE wordmark lives in the fixed navbar header (absolutely positioned, `translateX(-50%)` centered) and uses signal-driven inline styles (`translateY`, `font-size`, `line-height`, `letter-spacing`) to animate from the hero content position to the navbar center as the user scrolls. No CSS `transform: scale()` is used — transitions are done purely via font-size interpolation.
- `AuthPage.tsx`: Secure authentication interface for operator access.
- `Dashboard.tsx`: Main telemetry overview with regional benchmarks and market trends.
- `Watchlist.tsx`: User-saved stations feed with real-time pricing and distance.
- `MapPage.tsx`: Interactive regional map with search and nearby units side-panel.
- `Stations.tsx`: Detailed list of station terminals in a region with status and grade pricing.

### Components
- `TopNav`: Desktop-first navigation with links and settings dropdown (no wordmark — wordmark lives in Landing's scroll animation).
- `BottomNav`: Mobile-first navigation tabs.

## 6. Development Guidelines
1. **Maintain Aesthetics:** Never introduce rounded corners to cards or shadows. Keep the palette monochrome.
2. **Type Consistency:** Always use the typography trinity (Anybody/Source Serif/JetBrains Mono).
3. **Tailwind v4:** Use the new CSS-first theme tokens defined in `index.css`.
4. **Solid.js Patterns:** Use `createSignal` for state and `onMount` for lifecycle events.
5. **Environment Setup:** Copy `.env.example` to `.env` and fill in `MONGODB_URI` and `JWT_SECRET` before running the server.
6. **Running the App:** Use `bun run dev:all` to start both frontend (port 3000) and backend (port 3001) concurrently.
7. **Update Context:** Every change to the feature set must be reflected in this file.
8. **Mobile-First Design:** All UI must be implemented mobile-first. Default (unprefixed) Tailwind classes apply to mobile. Use `md:`, `lg:` prefixes to override for larger screens. Text sizes, spacing, and layout should be tuned for small screens first and scale up.
