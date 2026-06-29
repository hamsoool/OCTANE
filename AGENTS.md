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
- **Map Stack:** MapLibre GL JS (v5.24.0) with OpenFreeMap vector tiles (Liberty style + CSS monochrome-dark filter), Nominatim geocoding API, and OSRM (Open Source Routing Machine) public table API for road distance calculations between user origin and stations.
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
- **DOE Fuel Prices:** `server/src/utils/fuelPrices.ts` fetches live pump prices and price adjustments from the soul-scraper API. It applies the latest adjustments based on the brand of each gas station (matching Olongapo City and Subic specifically) and caches the combined results in Redis for 24 hours. The preferred display grade is set via `DOE_PREFERRED_GRADE` (default: `ron91`).

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
  - `server/src/routes/stations.ts`: Overpass API fuel stations with live DOE prices. Uses Upstash Redis (`stations:zambales`, 24h TTL) as primary cache; in-memory fallback (1h TTL) when Redis is unavailable. Calculates station-specific fuel prices using `calculateStationPrices` from `fuelPrices.ts` and attaches `brand`, `preferredGrade`, `price`, `priceGrade`, and `fuelData` (diesel/ron91/ron95/ron97) to each station. Falls back to seeded pricing if DOE data is unavailable. No `status` field.
  - `server/src/middleware/auth.ts`: JWT authentication middleware. Reads token from `req.cookies.session`.
  - `server/src/utils/cipher.ts`: AES-256-GCM encrypt/decrypt utility.
  - `server/src/utils/email.ts`: Brevo transactional email sender with 2FA code template.
  - `server/src/utils/redis.ts`: Upstash Redis client singleton.
  - `server/src/routes/savedStations.ts`: CRUD for user-saved stations. `GET /top` aggregates across all users to return the 4 most-saved stations with their average diesel price (used by Dashboard stational benchmarks).
  - `server/src/utils/fuelPrices.ts`: DOE fuel price fetcher and parser. Calls soul-scraper API with exponential backoff retry (3 attempts, 1s/2s/4s), queries `/latest` to get the latest structured JSON pump prices and adjustments (falling back to searching past documents for the latest readable week if current pump prices PDF is scanned/empty), and provides `calculateStationPrices` to apply adjustments to base prices for each station brand. Caches results in Redis (`fuel:prices:north-luzon`, 24h TTL) with in-memory fallback (6h TTL).
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
- `Dashboard.tsx`: Main telemetry overview with stational benchmarks (top 4 most-saved stations by all users, showing average diesel price and save count) and market trends (regular users). Displays a live Manila Time clock in the Global Trend Indicator section, updated every second via `setInterval` and `Asia/Manila` timezone formatting.
- `AdminDashboard.tsx`: Admin console with system stats, operator directory table, and audit trail access (admin users only).
- `Watchlist.tsx`: User-saved stations feed with real-time pricing and distance.
- `MapPage.tsx`: Interactive regional map with search and nearby stations side-panel. Integrated with MapLibre GL JS, OpenFreeMap (Liberty style with monochrome-dark canvas filter), and Nominatim geocoding API. Features debounced searching, coordinate/text cache lookup, dynamic distance calculation using the Haversine formula, dynamic list sorting with OSRM road distance caching, mobile collapsible side drawer, and click-to-view telemetry popups with custom styling. **Each station card shows real DOE prices** (Diesel/RON 91/RON 95/RON 97) sourced from the soul-scraper API, with a compact multi-grade breakdown in the sidebar and grade-annotated prices in popups. Uses `apiGet` from `src/api.ts` to fetch stations (no hardcoded URLs). Features loading spinner (`SCANNING_NETWORK...`) and error state with `[RETRY_CONNECTION]` button when the backend is unreachable. **User origin system** — users can set their location via GPS (browser geolocation) or by dropping a pin on the map. When an origin is set, station distances in the sidebar are computed from the origin rather than the map center, and a `my_location` icon marker with a pulsing ring appears on the map (GPS) or a `pin_drop` icon (pin drop). A PIN mode toggle (`pin_drop` button) changes the map cursor to crosshair and listens for a map click to drop the origin. A CLEAR button resets the origin. Origin status is displayed in the sidebar header as "ORIGIN: GPS FIX" or "ORIGIN: PIN DROP". **Road distance** via OSRM table API — when an origin is set, `fetchRoadDistances()` calls the OSRM table endpoint with `annotations=distance` to get real driving distances from origin to all stations, cached per session. Falls back to Haversine if OSRM is unreachable. Distance cards show `[ROAD]` or `[LINEAR]` badge accordingly. A "ROUTING..." indicator is shown in sidebar while fetching. Integrated with MapLibre GL JS, OpenFreeMap (Liberty style with monochrome-dark canvas filter), and Nominatim geocoding API. Features debounced searching, coordinate/text cache lookup, dynamic distance calculation using the Haversine formula, dynamic list sorting, mobile collapsible side drawing drawer, and click-to-view telemetry popups with custom styling. **Each station card shows real DOE prices** (Diesel/RON 91/RON 95/RON 97) sourced from the soul-scraper API, with a compact multi-grade breakdown in the sidebar and grade-annotated prices in popups. Uses `apiGet` from `src/api.ts` to fetch stations (no hardcoded URLs). Features loading spinner (`SCANNING_NETWORK...`) and error state with `[RETRY_CONNECTION]` button when the backend is unreachable. Search overlay is `fixed` outside the map wrapper (wrapped in fragment `<>`) to prevent MapLibre canvas from intercepting pointer events. **Fuel grade labels are brand-aware** via `fuelLabel()` (defined at module scope, shared by MapPage and MapResult): Caltex → Silver/Platinum, Petron → Diesel Max/Xtra Advance/XCS, Petro Gazz → Unleaded/Premium, Total → Premier 91/Excellium 95, Cleanfuel → Clean 91/Premium 95, Petrol → Eco Green/Max Super, PTT → Save+DIESEL/Eco+/Power+, Flying V → deciVel/Volt/Thunder, Planet Gas → Unleaded/Premium, Shell → FuelSave Diesel/FuelSave Gasoline/V-POWER Gasoline/V-POWER Racing. **Shell-specific RON 97** displayed as separate row in sidebar and popup. Default labels (unrecognized brands) show DIESEL / UNLEADED / PREMIUM. Primary price displayed as **approximate** (`~₱XX.XX` with "APPROX" label); disclaimer `* APPROXIMATE BASED ON AGGREGATED DATA` in popup footer and sidebar. ₱ peso sign shown on primary value only. **Map markers** use `local_gas_station` Material Symbol icon with theme-aware colors: DEFAULT → `#e0e0e0` / NOIR → `#e5e5e5` / selected → `#c3d9f3` (via `MAP_THEMES[theme].colors.marker`). Hover uses `opacity-75` (no `scale-125` to avoid conflicting with MapLibre CSS transforms). `selectStation()` flyTo pans without changing zoom (sidebar click uses padding for sidebar offset, map marker click has no padding). `getSeededStatus()` removed — no `status` field in API response or UI. **User origin system** — users can set their location via GPS (browser geolocation) or by dropping a pin on the map. When an origin is set, station distances in the sidebar are computed from the origin rather than the map center, and a `my_location` icon marker with a pulsing ring appears on the map. A PIN mode toggle (`pin_drop` button) changes the map cursor to crosshair and listens for a map click to drop the origin. A CLEAR button resets the origin. Origin status is displayed in the sidebar header as "ORIGIN: GPS FIX" or "ORIGIN: PIN DROP". **Road distance** via OSRM API (`router.project-osrm.org`) — when an origin is set, `fetchRoadDistances()` calls the OSRM table endpoint with `annotations=distance` to get real driving distances from origin to all stations, cached per session. Falls back to Haversine if OSRM is unreachable. Distance cards show `[ROAD]` or `[LINEAR]` badge accordingly. A "ROUTING..." indicator is shown in sidebar while fetching. **Route line** — when a station is selected while origin is set, a **ROUTE** button (`north_east` icon) appears in the station popup on the map. Clicking it draws a route overlay on the map using OSRM's route endpoint (`geometries=geojson`). An ice-blue line follows the road network from origin to station. The selected marker shows a **directions** icon badge while route is active. Clicking the button again hides the route. Route is cleaned up on deselect or origin clear. **Route button click handler** is attached directly to the popup DOM element via `popup.getElement().addEventListener()` (document-level event delegation was removed because MapLibre popups intercept pointer events). Route fetch shows `CALCULATING_ROUTE...` loading indicator in sidebar, and `ROUTE_NOT_FOUND` / `ROUTE_UNAVAILABLE` error feedback on failure. Cleanup uses `map()` signal (not captured closure) to avoid stale references.
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
