# OCTANE

Region-based fuel price intelligence and watchlist application. Track real-time fuel prices across regions, stations, and grades — all in one interface.

> **Status:** Prototype — early development. Features, structure, and design are subject to change.

## About

OCTANE is a fuel price watchlist app built for drivers who want to track and compare fuel prices across their region. Browse stations by region and province, view real-time price data, manage a personal watchlist of favourite stations, and locate stations on a map.

**Core features (in progress):**

- **Dashboard** — regional price benchmarks and market trend overview
- **Watchlist** — saved stations with live pricing and distance
- **Map Search** — locate nearby stations on an interactive map
- **Station Detail** — full station info including price history, services, and status

## Tech Stack

| Layer | Tool | Version |
|-------|------|---------|
| UI | [SolidJS](https://solidjs.com) | 1.9.13 |
| Language | [TypeScript](https://typescriptlang.org) | 5.9.3 |
| Bundler | [Vite](https://vitejs.dev) | 7.3.5 |
| Styling | [Tailwind CSS](https://tailwindcss.com) | 4.3.1 |
| Dev Tools | solid-devtools | 0.34.5 |

## Getting Started

```bash
# install dependencies
npm install  # or bun install

# start dev server
npm run dev  # or bun run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build  # or bun run build
```

Output is written to `dist/`.

## Design System

OCTANE uses the **Machined Precision** design system — a monochrome, austere aesthetic inspired by automotive instrument clusters. Built on three typefaces:

- **Anybody** — display headlines (uppercase, wide tracking)
- **Source Serif 4** — body text (serif, sentence case)
- **JetBrains Mono** — data, labels, buttons (monospace, uppercase)

Strict rules: no bold weights, no rounded corners outside buttons, no accent colour beyond `#c3d9f3` (ice-blue), 1px hairline dividers only.

## License

MIT
