export const MIN_FABRIC_SIDE_CM = 0.1
export const MAX_FABRIC_SIDE_CM = 10_000
export const MAX_SEAM_ALLOWANCE_CM = 20
export const MAX_CUTTING_ALLOWANCE_CM = 50
export const MAX_PIECE_COPIES = 99

export function parseCm(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const text = String(raw).trim().replace(',', '.')
  if (text === '') return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

export const cmToMm = (cm: number) => Math.round(cm * 10)
export const mmToCm = (mm: number) => String(mm / 10)

export function isValidFabricSideCm(raw: string | number): boolean {
  const value = parseCm(raw)
  return value !== null && value >= MIN_FABRIC_SIDE_CM && value <= MAX_FABRIC_SIDE_CM
}

export function isValidAllowanceCm(raw: string | number, max: number): boolean {
  const value = parseCm(raw)
  return value !== null && value >= 0 && value <= max
}
