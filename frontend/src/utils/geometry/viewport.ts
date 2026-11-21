export function clampPanOffset(
  raw: { x: number; y: number },
  max: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: Number(Math.min(Math.max(raw.x, -max.x), max.x).toFixed(1)),
    y: Number(Math.min(Math.max(raw.y, -max.y), max.y).toFixed(1)),
  }
}

export function buildRulerTicks(params: {
  viewportSizePx: number
  pxPerMm: number
  originPx: number
  minorStepMm: number
  majorStepMm: number
  invert?: boolean
}) {
  const { viewportSizePx, pxPerMm, originPx, minorStepMm, majorStepMm, invert = false } = params
  const dir = invert ? -1 : 1
  const startPx = invert ? originPx - viewportSizePx : -originPx
  const endPx = invert ? originPx : viewportSizePx - originPx

  const minMm = Math.floor(startPx / (pxPerMm * minorStepMm)) * minorStepMm - majorStepMm
  const maxMm = Math.ceil(endPx / (pxPerMm * minorStepMm)) * minorStepMm + majorStepMm

  const ticks: Array<{ px: number; label: string; isMajor: boolean }> = []
  for (let mm = minMm; mm <= maxMm; mm += minorStepMm) {
    const px = originPx + dir * mm * pxPerMm
    if (px >= -30 && px <= viewportSizePx + 30) {
      ticks.push({ px, label: `${mm}`, isMajor: mm % majorStepMm === 0 })
    }
  }
  return ticks
}
