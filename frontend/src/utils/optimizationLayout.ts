import type { OptimizationView, PlacedPieceViewItem } from '@/types/optimization'
import { getGeometryBoundsMm } from '@/utils/geometry'

export function toPreviewLayout(opt: OptimizationView) {
  const boundary = opt.fabric.boundary ?? []
  const fabricBoundary: [number, number][] =
    boundary.length >= 3
      ? boundary.map(({ x, y }) => [x, y])
      : [
          [0, 0],
          [opt.fabric.widthMm, 0],
          [opt.fabric.widthMm, opt.fabric.lengthMm],
          [0, opt.fabric.lengthMm],
        ]

  const pieceTypeNumberById = new Map<number, number>()
  for (const placement of opt.placements ?? []) {
    if (!pieceTypeNumberById.has(placement.patternPieceId)) {
      pieceTypeNumberById.set(placement.patternPieceId, pieceTypeNumberById.size + 1)
    }
  }

  const pieces: PlacedPieceViewItem[] = (opt.placements ?? []).flatMap((placement, index) => {
    if (!placement.polygon || placement.polygon.length < 3) return []
    const totalRotation =
      ((((placement.rotationAngle ?? 0) + (placement.isFlipped180 ? 180 : 0)) % 360) + 360) % 360

    return [
      {
        id: index + 1,
        patternPieceId: placement.patternPieceId,
        pieceNumber: pieceTypeNumberById.get(placement.patternPieceId) ?? index + 1,
        isMirrored: placement.isMirrored,
        rotationAngle: totalRotation,
        points: placement.polygon.map(({ x, y }): [number, number] => [x, y]),
      },
    ]
  })

  const bounds = getGeometryBoundsMm([fabricBoundary, ...pieces.map((piece) => piece.points)])

  return {
    fabricBoundary,
    pieces,
    coordinateOriginMm: bounds.originMm,
    widthMm: bounds.widthMm,
    heightMm: bounds.heightMm,
  }
}