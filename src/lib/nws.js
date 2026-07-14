// Thin client for the National Weather Service API (api.weather.gov).
// No API key required. Two calls are needed per location:
//   1. /points/{lat},{lon}      -> resolves to a forecast office + gridpoint,
//                                   and hands back the hourly forecast URL.
//   2. {forecastHourly URL}     -> hourly periods with temperature, wind,
//                                   and relative humidity.
const POINTS_CACHE_KEY = 'nws-points-cache-v1'

function loadPointsCache() {
  try {
    return JSON.parse(localStorage.getItem(POINTS_CACHE_KEY)) ?? {}
  } catch {
    return {}
  }
}

function savePointsCache(cache) {
  try {
    localStorage.setItem(POINTS_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore quota errors, cache is best-effort
  }
}

const pointsCache = loadPointsCache()

function cacheKey(lat, lon) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/geo+json' },
  })
  if (!res.ok) {
    throw new Error(`NWS request failed (${res.status}): ${url}`)
  }
  return res.json()
}

// Parses NWS windSpeed strings like "10 mph" or "5 to 10 mph" into a number.
function parseWindMph(windSpeed) {
  if (!windSpeed) return 0
  const matches = windSpeed.match(/\d+(\.\d+)?/g)
  if (!matches) return 0
  const nums = matches.map(Number)
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

async function resolveForecastHourlyUrl(lat, lon) {
  const key = cacheKey(lat, lon)
  if (pointsCache[key]) return pointsCache[key]

  const point = await fetchJson(`https://api.weather.gov/points/${lat},${lon}`)
  const url = point.properties?.forecastHourly
  if (!url) throw new Error(`No forecastHourly URL for ${lat},${lon}`)

  pointsCache[key] = url
  savePointsCache(pointsCache)
  return url
}

export async function fetchCurrentConditions(lat, lon) {
  const forecastUrl = await resolveForecastHourlyUrl(lat, lon)
  const forecast = await fetchJson(forecastUrl)
  const period = forecast.properties?.periods?.[0]
  if (!period) throw new Error(`No forecast periods for ${lat},${lon}`)

  const tempF =
    period.temperatureUnit === 'F' ? period.temperature : (period.temperature * 9) / 5 + 32
  const rh = period.relativeHumidity?.value ?? null
  const windMph = parseWindMph(period.windSpeed)

  if (rh == null) throw new Error(`No relative humidity for ${lat},${lon}`)

  return {
    tempF,
    rh,
    windMph,
    windDirection: period.windDirection,
    shortForecast: period.shortForecast,
    observedAt: period.startTime,
  }
}

// Runs async tasks with a bounded concurrency, invoking onProgress after each
// settles so callers can render an incremental loading state.
export async function mapWithConcurrency(items, worker, concurrency, onProgress) {
  const results = new Array(items.length)
  let cursor = 0
  let completed = 0

  async function runNext() {
    const i = cursor++
    if (i >= items.length) return
    try {
      results[i] = await worker(items[i], i)
    } catch (err) {
      results[i] = { error: err }
    } finally {
      completed++
      onProgress?.(completed, items.length)
      await runNext()
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, runNext)
  await Promise.all(workers)
  return results
}
