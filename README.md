# OCTANE

Region-based fuel price intelligence and watchlist application. Track real-time fuel prices from the Department of Energy (DOE) across stations, regions, and grades — displayed on an interactive map with driving distances.

## Features

- **Interactive Map** — MapLibre GL JS map with OpenFreeMap tiles, monochrome theme, station markers with real DOE prices (Diesel, RON 91, RON 95, RON 97), brand-aware fuel labels, and custom telemetry popups
- **User Origin System** — set your location via GPS (live tracking) or pin drop; station distances computed from origin using OSRM road distance API with Haversine fallback; route line overlay on station selection
- **Station Search** — debounced Nominatim geocoding search with coordinate parsing, station name filter, and LRU-cached suggestions dropdown
- **Authentication** — username/password login and registration with 6-digit OTP verification via email (Brevo), JWT session cookies, idle timeout logout, and role-based access (regular / admin)
- **Dashboard** — regional price benchmarks, image carousel, and market trend indicators
- **Admin Console** — operator directory, system stats, and audit trail access (admin only)
- **Watchlist** — saved stations feed with live pricing, distance, and price delta tracking
- **Station List** — terminal detail view with status badges, grade-level pricing, and geographic metadata
- **Cookie Consent** — two-tier consent (necessary-only or all) with granular preference toggles synced to user profile
- **Responsive Design** — mobile-first layout with collapsible sidebar, bottom navigation, desktop top navigation with settings dropdown

## Tech Stack

| Layer | Tool | Version |
|-------|------|---------|
| Frontend | [SolidJS](https://solidjs.com) | 1.9.13 |
| Language | [TypeScript](https://typescriptlang.org) | 5.9.3 |
| Bundler | [Vite](https://vitejs.dev) | 7.3.5 |
| Styling | [Tailwind CSS](https://tailwindcss.com) | 4.3.1 |
| Maps | [MapLibre GL JS](https://maplibre.org) | 5.24.0 |
| Backend | [Express.js](https://expressjs.com) | 4.22 |
| Database | [MongoDB Atlas](https://mongodb.com) via [Mongoose](https://mongoosejs.com) | 8.24 |
| Auth | bcryptjs + jsonwebtoken (httpOnly session cookie) | — |
| Cache | [Upstash Redis](https://upstash.com) | 1.38 |
| Email | [Brevo](https://brevo.com) transactional API | — |
| Map Tiles | [OpenFreeMap](https://openfreemap.org) (Liberty style) | — |
| Geocoding | [Nominatim](https://nominatim.org) (OpenStreetMap) | — |
| Routing | [OSRM](https://project-osrm.org) public API | — |
| PWA | vite-plugin-pwa | — |

## Getting Started

### Prerequisites

- Node.js >= 18 or Bun

### Setup

```bash
# install dependencies
npm install

# copy environment variables
cp .env.example .env
```

Fill in `MONGODB_URI`, `JWT_SECRET`, and `ENCRYPTION_KEY` in `.env`. Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` for rate limiting and caching, `BREVO_API_KEY` for email verification.

### Development

```bash
# start both frontend (port 3000) and backend (port 3001)
npm run dev:all
```

The app runs at [http://localhost:3000](http://localhost:3000). The Vite dev server proxies `/api` requests to the backend.

### Build

```bash
# build frontend and backend
npm run build:all
```

Output: `dist/` (frontend) and `server/dist/` (backend).

### Production

```bash
npm start
```

In production mode, Express serves the built frontend static files from `dist/`.

## Project Structure

```
src/
  pages/        — Landing, AuthPage, Dashboard, AdminDashboard, MapPage, Watchlist, Stations
  components/   — AppLayout, TopNav, BottomNav, CookieConsent
  constants/    — mapThemes, navigation config
  services/     — geolocation
  api.ts        — HTTP client with session management
  App.tsx       — routing shell
server/
  src/
    routes/     — auth.ts, stations.ts
    middleware/  — auth.ts, rateLimit.ts
    models/     — User.ts
    utils/      — cipher.ts, email.ts, redis.ts, fuelPrices.ts
    index.ts    — Express entry point
```

## License

MIT
