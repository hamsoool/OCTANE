# AGENTS.md - Project Context for LLMs

This document serves as the primary source of truth for any AI agent working on the OCTANE project. It provides the necessary context to maintain consistency in architecture, design, and feature implementation.

**IMPORTANT:** Every agent MUST read this file at the start of a session. Every agent MUST update this file whenever a new feature is added, a page is created, or the architecture is modified.

## 1. Project Overview
**Project Name:** OCTANE
**Purpose:** A high-end, region-based fuel price intelligence and watchlist application.
**Current Status:** Prototype / Initial Frontend. Live DOE fuel prices integrated via soul-scraper API.
**Aesthetic:** "Machined Precision" — austere, elite, clinical, monochrome. Inspired by automotive telemetry.

## 2. Tech Stack
- **Framework:** Solid.js (v1.9.13)
- **Language:** TypeScript (v5.9.3)
- **Bundler:** Vite (v7.3.5)
- **Styling:** Tailwind CSS v4 (v4.3.1) using `@tailwindcss/vite` plugin
- **Dev Tools:** solid-devtools (v0.34.5)
- **Backend:** Express.js (v4.22) with TypeScript via tsx
- **Database:** MongoDB Atlas via Mongoose (v8.24)
- **Auth:** bcryptjs (password hashing) + jsonwebtoken (JWT) via httpOnly session cookie
- **Session:** cookie-parser (v1.4) — JWT stored in httpOnly `session` cookie (secure in prod, sameSite lax)
- **Rate Limiting:** Upstash Redis (@upstash/redis v1.38) — IP rate limit (10/5min) + login attempt lockout (5 strikes, 15min lock)
- **Cookies:** Consent-based two-tier (necessary-only or all) stored in localStorage preference (`octane_cookie_consent`)
- **Map Stack:** MapLibre GL JS (v5.24.0) with OpenFreeMap vector tiles (Liberty style + CSS monochrome-dark filter) and Nominatim geocoding API
- **Font Stack:**
    - Display: Azonix (uppercase, wide tracking)
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
Uses `@solidjs/router` (v0.16) with nested route definitions in `App.tsx`.
- `Router` wraps the app, `Route` defines paths and components.
- `AppLayout` wraps authenticated pages (TopNav + `<main>` + BottomNav) and redirects to `/auth` if no token. On mount, calls `checkSession()` to restore session from httpOnly cookie.
- Landing (`/`) and AuthPage (`/auth`) are public; all other routes are protected (AppLayout checks session via cookie).
- `AdminDashboard` additionally guards against non-admin users. No `currentPage` signal — routing is URL-driven.

### Backend (server/)
- Express.js server at `server/src/index.ts` on port 3001.
- MongoDB connection via Mongoose using `MONGODB_URI` env variable.
- JWT-based auth with tokens stored in httpOnly session cookie (automatically sent with credentials: 'include').
- Auth middleware reads JWT from `req.cookies.session` (cookie-parser).
- `POST /api/auth/logout` clears the session cookie.
- `GET /api/auth/me` returns current user info from cookie session (requires valid JWT cookie).
- Rate limiting via Upstash Redis using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars.
- **DOE Fuel Prices:** `server/src/utils/fuelPrices.ts` fetches live prices from the soul-scraper API (`DOE_API_URL` env var, default: `https://soul-scaper.onrender.com`). Parses North Luzon Pump Price PDFs and caches results for 6 hours. The preferred display grade is set via `DOE_PREFERRED_GRADE` (default: `ron91`).

### Project Structure
- `src/App.tsx`: Main entry and routing shell.
- `src/index.css`: Tailwind v4 `@theme` configuration and base styles.
- `src/components/`: Shared UI components (TopNav, BottomNav, etc.).
- `src/pages/`: Page-level components.
- `src/api.ts`: Frontend API utility for backend communication.
- `server/`: Backend Express server.
  - `server/src/index.ts`: Server entry point.
  - `server/src/models/User.ts`: Mongoose User model with bcrypt hashing, AES-256-GCM encrypted userId.
  - `server/src/routes/auth.ts`: Auth routes (POST /api/auth/signin, POST /api/auth/register, POST /api/auth/verify, POST /api/auth/logout, GET /api/auth/me).
  - `server/src/routes/stations.ts`: Overpass API fuel stations with live DOE prices. Fetches real prices from `fuelPrices.ts` and attaches `price`, `priceGrade`, and `fuelData` (diesel/ron91/ron95/ron97) to each station. Falls back to seeded pricing if DOE data is unavailable.
  - `server/src/middleware/auth.ts`: JWT authentication middleware. Reads token from `req.cookies.session`.
  - `server/src/utils/cipher.ts`: AES-256-GCM encrypt/decrypt utility.
  - `server/src/utils/email.ts`: Brevo transactional email sender with 2FA code template.
  - `server/src/utils/redis.ts`: Upstash Redis client singleton.
  - `server/src/utils/fuelPrices.ts`: DOE fuel price fetcher and parser. Calls soul-scraper API, parses North Luzon Pump Prices PDF text (common price column per grade), and caches results for 6 hours.
  - `server/src/middleware/rateLimit.ts`: IP rate limit middleware (10 requests per 5 min).

### Auth Flow
1. User enters username, email (register only), and password on `AuthPage`.
2. Frontend calls `POST /api/auth/signin` or `/api/auth/register`. All auth endpoints are behind IP rate limiter (10 requests per 5 min via Upstash Redis).
3. **Registration:** Server creates user (unverified), generates 6-digit code, sends via Brevo email, returns `{ needsVerification: true, userId, email }`. Email sends rate-limited to 1 per 5 min via `lastCodeSentAt` field.
4. **Sign In:** If user is unverified, server checks email cooldown, then generates and sends new code. Failed login attempts tracked in Redis (5 max, 15min lockout on 5th failure). Success resets attempt counter.
5. Frontend shows 6-digit OTP input. User enters code, calls `POST /api/auth/verify`.
6. Server validates code, marks user as verified, returns JWT token containing userId, username, and role. Server also sets the token as an httpOnly `session` cookie.
7. Token is stored in memory via `src/api.ts` utility (`setToken`). Session persistence on page reload is handled by `checkSession()` which calls `GET /api/auth/me` to verify the httpOnly cookie.
8. App navigates to Dashboard (regular users) or AdminDashboard (admin users) based on role in JWT.

### User Roles
- `regular` — default role for new registrations (after the first user).
- `admin` — automatically assigned to the first registered user. Can be promoted manually via MongoDB.

## 5. Current Implementation State
### Pages
- `Landing.tsx`: Marketing entry page with scroll-reveal animations, scroll-driven OCTANE wordmark animation, and feature showcases. Inline nav becomes opaque on scroll. OCTANE wordmark lives in the fixed navbar header (absolutely positioned, `translateX(-50%)` centered) and uses signal-driven inline styles (`translateY`, `font-size`, `line-height`, `letter-spacing`) to animate from the hero content position to the navbar center as the user scrolls. No CSS `transform: scale()` is used — transitions are done purely via font-size interpolation.
- `AuthPage.tsx`: Secure authentication interface for operator access.
- `Dashboard.tsx`: Main telemetry overview with regional benchmarks and market trends (regular users).
- `AdminDashboard.tsx`: Admin console with system stats, operator directory table, and audit trail access (admin users only).
- `Watchlist.tsx`: User-saved stations feed with real-time pricing and distance.
- `MapPage.tsx`: Interactive regional map with search and nearby units side-panel. Integrated with MapLibre GL JS, OpenFreeMap (Liberty style with monochrome-dark canvas filter), and Nominatim geocoding API. Features debounced searching, coordinate/text cache lookup, live telemetry status reports, dynamic distance calculation using the Haversine formula, dynamic list sorting, mobile collapsible side drawing drawer, reactive DOM marker highlights, a live-updating telemetric sync clock displaying the current date-time, and click-to-view synchronous telemetry popups with custom styling. **Each station card now shows real DOE prices** (RON 91/95/97 + Diesel) sourced from the soul-scraper API, with a compact multi-grade breakdown (DSL/R91/R95) in the sidebar and grade-annotated prices in popups.
- `Stations.tsx`: Detailed list of station terminals in a region with status and grade pricing.

### Components
- `TopNav`: Desktop-first navigation with links and settings dropdown (no wordmark — wordmark lives in Landing's scroll animation). Logout calls `POST /api/auth/logout` then clears in-memory token.
- `BottomNav`: Mobile-first navigation tabs.
- `CookieConsent`: Fixed bottom banner with two-tier consent — "Accept Necessary" (essential session cookie only) and "Accept All" (allows future analytics). Preference stored in localStorage as `octane_cookie_consent`. Avoids showing if preference already set.

## 6. Development Guidelines
1. **Maintain Aesthetics:** Never introduce rounded corners to cards or shadows. Keep the palette monochrome.
2. **Type Consistency:** Always use the typography trinity (Anybody/Source Serif/JetBrains Mono).
3. **Tailwind v4:** Use the new CSS-first theme tokens defined in `index.css`.
4. **Solid.js Patterns:** Use `createSignal` for state and `onMount` for lifecycle events.
5. **Environment Setup:** Copy `.env.example` to `.env` and fill in `MONGODB_URI` and `JWT_SECRET` before running the server.
6. **Running the App:** Use `bun run dev:all` to start both frontend (port 3000) and backend (port 3001) concurrently. Vite proxies `/api` requests to the backend, so cookies work same-origin.
7. **Building for Production:** Use `bun run build:all` to build both frontend (`dist/`) and server (`server/dist/`). In production (`NODE_ENV=production`), Express serves the built frontend static files from `dist/`, making them same-origin.
8. **Deployment (Render):** Deploy as a single Web Service. Build command: `cd .. && npm run build && cd server && npm run build` or use root `build:all` script. Start command: `npm start` (runs `node server/dist/index.js`). Set env vars: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CORS_ORIGINS`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `BREVO_API_KEY`.
9. **Session Cookies:** JWT is stored in an httpOnly `session` cookie. In production (`NODE_ENV=production`), `sameSite="none"` + `secure=true` for cross-origin support. In development with Vite proxy, same-origin `sameSite="lax"` is used.
10. **Cookie Consent:** `CookieConsent` component stores preference in `localStorage.octane_cookie_consent` as `"necessary"` or `"all"`. The session cookie is set regardless (essential).
11. **Update Context:** Every change to the feature set must be reflected in this file.
12. **Mobile-First Design:** All UI must be implemented mobile-first. Default (unprefixed) Tailwind classes apply to mobile. Use `md:`, `lg:` prefixes to override for larger screens. Text sizes, spacing, and layout should be tuned for small screens first and scale up.
