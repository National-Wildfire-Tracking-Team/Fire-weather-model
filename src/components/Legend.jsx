import { FFWI_CATEGORIES } from '../lib/ffwi'

export default function Legend() {
  return (
    <div className="legend">
      <div className="legend-title">Fosberg Fire Weather Index</div>
      {FFWI_CATEGORIES.map((c, i) => {
        const min = i === 0 ? 0 : FFWI_CATEGORIES[i - 1].max
        const range = c.max === Infinity ? `${min}+` : `${min}–${c.max}`
        return (
          <div className="legend-row" key={c.label}>
            <span className="legend-swatch" style={{ background: c.color }} />
            <span className="legend-label">{c.label}</span>
            <span className="legend-range">{range}</span>
          </div>
        )
      })}
    </div>
  )
}
