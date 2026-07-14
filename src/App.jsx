import { useCallback, useEffect, useState } from 'react'
import FireWeatherMap from './components/FireWeatherMap'
import Legend from './components/Legend'
import { US_POINTS } from './lib/usPoints'
import { fetchCurrentConditions, mapWithConcurrency } from './lib/nws'
import { computeFFWI, categorizeFFWI } from './lib/ffwi'

const CONCURRENCY = 8

function initialStations() {
  return US_POINTS.map((p) => ({ ...p, ffwi: null, error: null }))
}

export default function App() {
  const [stations, setStations] = useState(initialStations)
  const [progress, setProgress] = useState({ done: 0, total: US_POINTS.length })
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selected, setSelected] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setProgress({ done: 0, total: US_POINTS.length })

    await mapWithConcurrency(
      US_POINTS,
      async (point, index) => {
        try {
          const conditions = await fetchCurrentConditions(point.lat, point.lon)
          const ffwi = computeFFWI(conditions)
          const category = categorizeFFWI(ffwi)
          setStations((prev) => {
            const next = [...prev]
            next[index] = { ...point, ...conditions, ffwi, category, error: null }
            return next
          })
        } catch (err) {
          setStations((prev) => {
            const next = [...prev]
            next[index] = { ...point, ffwi: null, error: err.message }
            return next
          })
        }
      },
      CONCURRENCY,
      (done, total) => setProgress({ done, total }),
    )

    setLoading(false)
    setLastUpdated(new Date())
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const loadedCount = stations.filter((s) => s.ffwi != null).length
  const failedCount = stations.filter((s) => s.error).length

  return (
    <div className="app">
      <header className="app-header">
        <h1>US Fire Weather Model</h1>
        <p className="subtitle">
          Live Fosberg Fire Weather Index computed from NWS temperature, humidity, and wind data
        </p>
      </header>

      <div className="map-wrap">
        <FireWeatherMap stations={stations} onSelectStation={setSelected} />
        <Legend />

        <div className="status-panel">
          {loading ? (
            <span>
              Loading stations… {progress.done}/{progress.total}
            </span>
          ) : (
            <span>
              {loadedCount} of {stations.length} stations loaded
              {failedCount > 0 ? ` (${failedCount} failed)` : ''}
              {lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString()}` : ''}
            </span>
          )}
          <button onClick={loadAll} disabled={loading}>
            Refresh
          </button>
        </div>

        {selected && (
          <div className="detail-panel">
            <button className="detail-close" onClick={() => setSelected(null)}>
              ×
            </button>
            <strong>{selected.name}</strong>
            <div>
              FFWI: <b>{selected.ffwi}</b> ({selected.category})
            </div>
            <div>
              {Math.round(selected.tempF)}°F · {Math.round(selected.rh)}% RH ·{' '}
              {Math.round(selected.windMph)} mph wind
            </div>
            {selected.shortForecast && <div className="forecast-text">{selected.shortForecast}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
