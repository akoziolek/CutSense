import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import type { PlacedPieceViewItem, ActivePieceDrag } from '@/types/optimization'
import { validateAllPiecesPlacement } from '@/utils/geometry'
import type { PlacementInvalidReason } from '@/types/geometry'

export function useOptimizationPieceDrag(options: {
  editable: Ref<boolean>
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  selectedPieceId: Ref<number | null>
  pieces: Ref<PlacedPieceViewItem[]>
  fabricBoundary: Ref<[number, number][]>
  totalAllowanceMm: Ref<number>
  pxPerMmX: Ref<number>
  pxPerMmY: Ref<number>
  onMovePiece: (payload: {
    index: number
    pieceId: number
    deltaXMm: number
    deltaYMm: number
  }) => void
  onInvalidMove?: (payload: {
    index: number
    pieceId: number
    reason: PlacementInvalidReason
  }) => void
  onUndo: () => void
  onRedo: () => void
}) {
  const draggingPiece = ref<ActivePieceDrag | null>(null)
  const ignoreNextClick = ref(false)

  const dragValidation = computed(() => {
    const drag = draggingPiece.value
    if (!drag || !drag.hasMoved) return { valid: true as const }

    const targetIdx = options.pieces.value.findIndex((p, idx) =>
      drag.index >= 0 ? idx === drag.index : p.id === drag.pieceId,
    )
    if (targetIdx === -1) return { valid: true as const }

    const allPoints = options.pieces.value.map((piece, idx) =>
      idx === targetIdx
        ? piece.points.map(([x, y]): [number, number] => [x + drag.deltaXMm, y + drag.deltaYMm])
        : piece.points,
    )

    const results = validateAllPiecesPlacement({
      piecesPoints: allPoints,
      fabricBoundary: options.fabricBoundary.value,
      totalAllowanceMm: options.totalAllowanceMm.value,
    })

    return results[targetIdx] ?? { valid: true as const }
  })

  const handlePieceMouseDown = (piece: PlacedPieceViewItem, e: MouseEvent) => {
    if (!options.editable.value || e.button !== 0) return
    e.stopPropagation()

    draggingPiece.value = {
      pieceId: piece.id,
      index: piece.index,
      startClientX: e.clientX,
      startClientY: e.clientY,
      deltaXMm: 0,
      deltaYMm: 0,
      hasMoved: false,
    }
  }

  const handleWindowMouseMove = (e: MouseEvent) => {
    const drag = draggingPiece.value
    if (!drag) return

    const dxPx = e.clientX - drag.startClientX
    const dyPx = e.clientY - drag.startClientY

    if (!drag.hasMoved && Math.hypot(dxPx, dyPx) > 3) {
      drag.hasMoved = true
    }

    if (drag.hasMoved) {
      drag.deltaXMm = dxPx / (options.pxPerMmX.value || 1)
      drag.deltaYMm = -dyPx / (options.pxPerMmY.value || 1)
    }
  }

  const handleWindowMouseUp = () => {
    const drag = draggingPiece.value
    if (!drag) return

    const validation = dragValidation.value
    draggingPiece.value = null

    if (drag.hasMoved) {
      ignoreNextClick.value = true
      setTimeout(() => {
        ignoreNextClick.value = false
      }, 0)

      options.onMovePiece({
        index: drag.index,
        pieceId: drag.pieceId,
        deltaXMm: drag.deltaXMm,
        deltaYMm: drag.deltaYMm,
      })

      if (!validation.valid && options.onInvalidMove) {
        options.onInvalidMove({
          index: drag.index,
          pieceId: drag.pieceId,
          reason: validation.reason ?? 'overlap',
        })
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!options.editable.value) return

    const target = e.target
    const isEditableInput =
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    if (isEditableInput) return

    if ((e.ctrlKey || e.metaKey) && !draggingPiece.value) {
      const key = e.key.toLowerCase()
      if (key === 'z' || key === 'y') {
        e.preventDefault()
        if (key === 'y' || e.shiftKey) {
          if (options.canRedo.value) options.onRedo()
        } else if (options.canUndo.value) {
          options.onUndo()
        }
      }
      return
    }

    if (
      !draggingPiece.value &&
      options.selectedPieceId.value !== null &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    ) {
      const selectedPiece = options.pieces.value.find((p) => p.id === options.selectedPieceId.value)
      if (!selectedPiece) return

      e.preventDefault()

      const stepMm = e.shiftKey ? 10 : e.altKey ? 0.5 : 1

      let deltaXMm = 0
      let deltaYMm = 0

      if (e.key === 'ArrowLeft') deltaXMm = -stepMm
      if (e.key === 'ArrowRight') deltaXMm = stepMm
      if (e.key === 'ArrowUp') deltaYMm = stepMm
      if (e.key === 'ArrowDown') deltaYMm = -stepMm

      options.onMovePiece({
        index: selectedPiece.index,
        pieceId: selectedPiece.id,
        deltaXMm,
        deltaYMm,
      })
    }
  }

  onMounted(() => {
    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', handleWindowMouseMove)
    window.removeEventListener('mouseup', handleWindowMouseUp)
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    draggingPiece,
    dragValidation,
    ignoreNextClick,
    handlePieceMouseDown,
  }
}
