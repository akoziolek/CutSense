export function clampPanOffset(
  raw: { x: number; y: number },
  max: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: Number(Math.min(Math.max(raw.x, -max.x), max.x).toFixed(1)),
    y: Number(Math.min(Math.max(raw.y, -max.y), max.y).toFixed(1)),
  }
}

export function getRulerSteps(
  pxPerMm: number,
  minMajorSpacingPx = 48,
): {
  minorStepMm: number
  majorStepMm: number
} {
  const rawStepMm = Math.max(10, minMajorSpacingPx / pxPerMm)

  const magnitude = 10 ** Math.floor(Math.log10(rawStepMm))
  const normalized = rawStepMm / magnitude

  let majorStepMm: number
  const subdivisions: number = 5

  if (normalized <= 1) {
    majorStepMm = magnitude
  } else if (normalized <= 2) {
    majorStepMm = 2 * magnitude
  } else if (normalized <= 5) {
    majorStepMm = 5 * magnitude
  } else {
    majorStepMm = 10 * magnitude
  }

  return {
    majorStepMm,
    minorStepMm: Math.max(1, majorStepMm / subdivisions),
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

export function getCrosshairState(params: {
  clientX: number
  clientY: number
  containerRect: { left: number; top: number; width: number; height: number }
  sheet: { left: number; bottom: number; width: number; height: number }
  canvasWidthMm: number
  canvasHeightMm: number
}) {
  const { clientX, clientY, containerRect, sheet, canvasWidthMm, canvasHeightMm } = params
  const x = clientX - containerRect.left
  const y = clientY - containerRect.top

  return {
    x,
    y,
    mmX: Math.round(((x - sheet.left) / sheet.width) * canvasWidthMm),
    mmY: Math.round(((sheet.bottom - y) / sheet.height) * canvasHeightMm),
    flipLeft: x > containerRect.width - 150,
    flipTop: y > containerRect.height - 48,
  }
}
