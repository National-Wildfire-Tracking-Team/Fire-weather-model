import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const SOURCE_ID = 'fire-weather-stations'
const CIRCLE_LAYER_ID = 'fire-weather-circles'

function stationsToGeoJson(stations) {
  return {
    type: 'FeatureCollection',
    features: stations
      .filter((s) => s.ffwi != null)
      .map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: {
          name: s.name,
          ffwi: s.ffwi,
          category: s.category.label,
          color: s.category.color,
          tempF: s.tempF,
          rh: s.rh,
          windMph: s.windMph,
          shortForecast: s.shortForecast,
        },
      })),
  }
}

export default function FireWeatherMap({ stations, onSelectStation, onError }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const stationsRef = useRef(stations)
  stationsRef.current = stations

  useEffect(() => {
    if (!mapboxgl.accessToken) {
      onError?.(
        'No Mapbox token configured. Copy .env.example to .env and set VITE_MAPBOX_TOKEN, then restart the dev server.',
      )
      return
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98.5, 39.5],
      zoom: 3.4,
      minZoom: 2,
      maxZoom: 12,
    })
    mapRef.current = map

    map.on('error', (e) => {
      const status = e.error?.status
      const message =
        status === 401 || status === 403
          ? 'Mapbox rejected the access token (invalid, expired, or URL-restricted). Check VITE_MAPBOX_TOKEN and your token\'s URL restrictions at account.mapbox.com/access-tokens.'
          : `Mapbox error: ${e.error?.message ?? 'failed to load map resources.'}`
      console.error('Mapbox GL error', e.error)
      onError?.(message)
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: stationsToGeoJson(stationsRef.current),
      })

      map.addLayer({
        id: CIRCLE_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 8, 14],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(0,0,0,0.4)',
          'circle-opacity': 0.85,
        },
      })

      map.on('mouseenter', CIRCLE_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', CIRCLE_LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })

      map.on('click', CIRCLE_LAYER_ID, (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        onSelectStation?.(feature.properties)

        new mapboxgl.Popup({ closeButton: true, offset: 12 })
          .setLngLat(feature.geometry.coordinates)
          .setHTML(
            `<div class="ffwi-popup">
              <strong>${feature.properties.name}</strong>
              <div>FFWI: <b>${feature.properties.ffwi}</b> (${feature.properties.category})</div>
              <div>${Math.round(feature.properties.tempF)}°F, ${Math.round(feature.properties.rh)}% RH, ${Math.round(feature.properties.windMph)} mph wind</div>
              <div class="ffwi-popup-forecast">${feature.properties.shortForecast ?? ''}</div>
            </div>`,
          )
          .addTo(map)
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource(SOURCE_ID)
    if (!source) return
    source.setData(stationsToGeoJson(stations))
  }, [stations])

  return <div ref={containerRef} className="map-container" />
}
