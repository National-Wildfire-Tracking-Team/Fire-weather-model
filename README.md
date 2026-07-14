# US Fire Weather Model

A live fire-danger map for the entire United States. It samples live weather
from the National Weather Service, runs it through the Fosberg Fire Weather
Index (FFWI), and plots the result on an interactive Mapbox map.

## How it works

1. **Sample points** (`src/lib/usPoints.js`) — ~120 locations covering all 50
   states, DC, and Puerto Rico, weighted toward the fire-prone West.
2. **Live weather** (`src/lib/nws.js`) — for each point, calls the NWS API
   (`api.weather.gov`, no key required):
   - `/points/{lat},{lon}` resolves the location to a forecast office/gridpoint
     and hands back an hourly forecast URL (cached in `localStorage`, since
     this mapping never changes).
   - The hourly forecast endpoint returns current temperature, relative
     humidity, and wind speed.
   - Requests run with bounded concurrency (8 at a time) so the whole country
     loads without hammering the API.
3. **Fire Weather Index** (`src/lib/ffwi.js`) — implements the Fosberg Fire
   Weather Index (Fosberg 1978 / NFDRS equilibrium moisture content), which
   combines temperature, relative humidity, and wind speed into a single
   0–100+ fire-danger score. Scores are bucketed into Low / Moderate / High /
   Very High / Extreme.
4. **Map** (`src/components/FireWeatherMap.jsx`) — Mapbox GL JS renders every
   station as a colored point, live-updating as data streams in. Click a
   point for details (temperature, humidity, wind, short forecast).

## Running it

```bash
cp .env.example .env   # then paste your Mapbox token into .env
npm install
npm run dev
```

The Mapbox token is read from `.env` as `VITE_MAPBOX_TOKEN`. `.env` is
git-ignored — GitHub's push protection blocks committed Mapbox tokens, so
keep it local (or set `VITE_MAPBOX_TOKEN` as an env var in your hosting
provider for production builds).

## Known limitations

- **Sample points, not a continuous grid.** ~120 representative locations,
  not every square mile of the US. Good enough for a national overview; not
  a substitute for official NFDRS/Red Flag products for a specific parcel of
  land.
- **FFWI is a simplified index.** It doesn't account for fuel moisture,
  drought conditions, or vegetation type the way the full National
  Fire-Danger Rating System (NFDRS) does. Category thresholds (25/40/50/75)
  are commonly used but not an official government scale.
- **Client-side only.** All API calls happen directly from the browser (both
  `api.weather.gov` and `api.mapbox.com` support CORS), so there's no backend
  to deploy — just host the static build anywhere.
- This was built and sanity-checked (build, FFWI math) in a sandboxed dev
  environment whose network egress policy blocks both `api.weather.gov` and
  `api.mapbox.com`, so the live map itself could not be visually verified
  end-to-end from that sandbox. The code follows documented, CORS-enabled
  public APIs; verify the live map once in an environment with normal
  internet access.
