// Fosberg Fire Weather Index (FFWI).
// Reference: Fosberg, M.A. (1978), "Weather in wildland fire management:
// The fire weather index," and the equilibrium-moisture-content
// coefficients from Deeming et al., National Fire-Danger Rating System.
//
// Inputs: temperature in Fahrenheit, relative humidity in percent (0-100),
// wind speed in mph. Output is unitless, conventionally 0-~100+.

function equilibriumMoistureContent(tempF, rh) {
  if (rh < 10) {
    return 0.03229 + 0.281073 * rh - 0.000578 * rh * tempF
  }
  if (rh <= 50) {
    return 2.22749 + 0.160107 * rh - 0.014784 * tempF
  }
  return 21.0606 + 0.005565 * rh * rh - 0.00035 * rh * tempF - 0.483199 * rh
}

export function computeFFWI({ tempF, rh, windMph }) {
  const m = equilibriumMoistureContent(tempF, rh)
  const moistureDamping =
    1 - 2 * (m / 30) + 1.5 * (m / 30) ** 2 - 0.5 * (m / 30) ** 3
  const ffwi = (moistureDamping * Math.sqrt(1 + windMph ** 2)) / 0.3002
  return Math.max(0, Math.round(ffwi * 10) / 10)
}

// Category breakpoints are illustrative (not an official NWS/NFDRS scale)
// but follow the commonly used FFWI ranges for public-facing fire danger maps.
export const FFWI_CATEGORIES = [
  { max: 25, label: 'Low', color: '#2e7d32' },
  { max: 40, label: 'Moderate', color: '#f2c94c' },
  { max: 50, label: 'High', color: '#f2994a' },
  { max: 75, label: 'Very High', color: '#eb5757' },
  { max: Infinity, label: 'Extreme', color: '#8e24aa' },
]

export function categorizeFFWI(value) {
  return FFWI_CATEGORIES.find((c) => value <= c.max) ?? FFWI_CATEGORIES[FFWI_CATEGORIES.length - 1]
}
