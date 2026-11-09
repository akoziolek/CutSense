import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'
import { useSpatialHistory, type SpatialHistoryAction } from './useSpatialHistory'

export type { SpatialHistoryAction }

interface SpatialWorkspaceExposed {
  getPointFromEvent: (e: MouseEvent) => Point2D | null
}

interface useSpatialWorkspaceOptions {
  workspaceRef: Ref<SpatialWorkspaceExposed | null>
  initialPxPerMm?: number
  initialPoints?: Point2D[]
  getCurrentTarget?: () => { photoIndex: number; shapeId: string } | null
  onSelectTarget?: (photoIndex: number, shapeId: string, restoredPoints: Point2D[]) => void
  onThreadAngleChange?: (newAngle: number) => void
  currentThreadAngle?: Ref<number>
  onShapeCreated?: (newShape: Point2D[]) => SpatialHistoryAction | void
  allowMultipleShapes?: boolean | Ref<boolean>
}

export function useSpatialWorkspace(options: useSpatialWorkspaceOptions) {
  const defaultPxPerMm = 1
  const {
    workspaceRef,
    initialPxPerMm,
    initialPoints,
    getCurrentTarget,
    onSelectTarget,
    onThreadAngleChange,
    currentThreadAngle,
    onShapeCreated,
    allowMultipleShapes = false,
  } = options

  const backupShape: Point2D[] = [
    { pctX: 20, pctY: 20 },
    { pctX: 80, pctY: 20 },
    { pctX: 80, pctY: 80 },
    { pctX: 20, pctY: 80 },
  ]

  const clonePoints = (pts: Point2D[]): Point2D[] => pts.map(({ pctX, pctY }) => ({ pctX, pctY }))

  const pointsMatch = (first: Point2D[], second: Point2D[]) =>
    first.length === second.length &&
    first.every((point, index) => {
      const other = second[index]
      return other?.pctX === point.pctX && other.pctY === point.pctY
    })

  // how many pixels per millimeter
  const pxPerMm = ref<number>(
    initialPxPerMm && initialPxPerMm > 0 ? initialPxPerMm : defaultPxPerMm,
  )
  // postgis format
  const points = ref<Point2D[]>(
    initialPoints && initialPoints.length >= 3
      ? clonePoints(initialPoints)
      : clonePoints(backupShape),
  )
  const originalPoints = ref<Point2D[]>(clonePoints(points.value))
  const dragStartPoints = ref<Point2D[] | null>(null)

  const { recordAction, undo: undoHistory, redo: redoHistory } = useSpatialHistory()

  const recordPointChange = (before: Point2D[], after: Point2D[]) => {
    if (pointsMatch(before, after)) return

    const target = getCurrentTarget?.()
    const beforeCloned = clonePoints(before)
    const afterCloned = clonePoints(after)

    recordAction({
      undo: () => {
        if (target?.shapeId && onSelectTarget) {
          onSelectTarget(target.photoIndex, target.shapeId, beforeCloned)
        } else {
          points.value = clonePoints(beforeCloned)
        }
      },
      redo: () => {
        if (target?.shapeId && onSelectTarget) {
          onSelectTarget(target.photoIndex, target.shapeId, afterCloned)
        } else {
          points.value = clonePoints(afterCloned)
        }
      },
    })
  }

  const undoPointMove = () => undoHistory()
  const redoPointMove = () => redoHistory()

  const updateOriginalPoints = (newPoints: Point2D[]) => {
    originalPoints.value = clonePoints(newPoints)
    points.value = clonePoints(newPoints)
  }

  const selectedEdgeIndex = ref<number | null>(null)
  const selectedPointIndex = ref<number | null>(null)
  const zoomLevel = ref(1)
  const imageRotation = ref(0)
  const threadAngle = ref(currentThreadAngle?.value ?? 0)

  const activeTool = ref<'select' | 'pan'>('select')
  const canvasOffset = ref({ x: 0, y: 0 })
  const isSpacePressed = ref(false)
  const isDraggingCanvas = ref(false)
  const panStart = ref({ x: 0, y: 0 })

  const creatingEdgeIndex = ref<number | null>(null)
  const previewPoint = ref<Point2D | null>(null)
  const draggingPointIndex = ref<number | null>(null)

  // Flag preventing false click event on canvas background right after edge/point interaction
  let justFinishedInteraction = false

  const drawingPoints = ref<Point2D[]>([])
  const AUTO_CLOSE_THRESHOLD_PCT = 3.5

  const isMoveMode = computed(() => isSpacePressed.value || activeTool.value === 'pan')

  const canDelete = computed(() => points.value.length > 0 || drawingPoints.value.length > 0)
  const isInteractiveDragging = computed(
    () => creatingEdgeIndex.value !== null || draggingPointIndex.value !== null,
  )

  const isNearStartPoint = computed(() => {
    if (!previewPoint.value) return false
    return checkIsNearStart(previewPoint.value)
  })

  
  const cancelDrawing = () => {
    drawingPoints.value = []
    previewPoint.value = null
  }

  const finishDrawing = () => {
    if (drawingPoints.value.length >= 3) {
      const createdShape = clonePoints(drawingPoints.value)
      const historyAction = onShapeCreated?.(createdShape)
      if (historyAction) recordAction(historyAction)
    }
    cancelDrawing()
  }

  const checkIsNearStart = (pt: Point2D) => {
    if (drawingPoints.value.length < 3) return false
    const startPt = drawingPoints.value[0]!
    const dist = Math.hypot(pt.pctX - startPt.pctX, pt.pctY - startPt.pctY)
    return dist <= AUTO_CLOSE_THRESHOLD_PCT
  }

  const handleImageClick = (clickPoint: Point2D) => {
    if (isMoveMode.value || justFinishedInteraction) return

    // drawing mode
    if (drawingPoints.value.length > 0) {
      if (drawingPoints.value.length >= 3 && checkIsNearStart(clickPoint)) {
        finishDrawing()
        return
      }
      drawingPoints.value.push(clickPoint)
      return
    }

    const canDrawMultiple =
      typeof allowMultipleShapes === 'boolean' ? allowMultipleShapes : allowMultipleShapes.value

    if (!canDrawMultiple) return

    selectedPointIndex.value = null
    selectedEdgeIndex.value = null
    drawingPoints.value.push(clickPoint)
  }

  const deleteSelected = (onDeleteActiveShape?: () => void) => {
    if (drawingPoints.value.length > 0) {
      drawingPoints.value.pop()
      return
    }

    if (!canDelete.value) return

    const beforeDelete = clonePoints(points.value)

    if (selectedPointIndex.value !== null) {
      if (points.value.length > 3) {
        points.value.splice(selectedPointIndex.value, 1)
        selectedPointIndex.value = null
        recordPointChange(beforeDelete, points.value)
      }
    } else if (selectedEdgeIndex.value !== null) {
      if (points.value.length >= 5) {
        const edgeIdx = selectedEdgeIndex.value
        const numPoints = points.value.length
        const p1Idx = edgeIdx
        const p2Idx = (edgeIdx + 1) % numPoints

        if (p2Idx === 0) {
          points.value.splice(numPoints - 1, 1)
          points.value.splice(0, 1)
        } else {
          points.value.splice(p1Idx, 2)
        }
        selectedEdgeIndex.value = null
        recordPointChange(beforeDelete, points.value)
      }
    } else if (onDeleteActiveShape) {
      onDeleteActiveShape()
    }
  }

  const imageDimensions = ref({ width: 1000, height: 1000 })
  const setImageDimensions = (width: number, height: number) => {
    if (width > 0 && height > 0) {
      imageDimensions.value = { width, height }
    }
  }

  const getImagePixelDistance = (p1: Point2D, p2: Point2D): number => {
    const { width, height } = imageDimensions.value
    const w = width > 0 ? width : 1000
    const h = height > 0 ? height : 1000

    const dx = ((p2.pctX - p1.pctX) / 100) * w
    const dy = ((p2.pctY - p1.pctY) / 100) * h

    return Math.hypot(dx, dy)
  }

  const calculateEdgesForShape = (
    shapePoints: Point2D[],
    customPxPerMm = pxPerMm.value,
  ): PolygonEdge[] => {
    if (!shapePoints || shapePoints.length < 2 || customPxPerMm <= 0) return []

    const result: PolygonEdge[] = []
    const n = shapePoints.length
    for (let index = 0; index < n; index++) {
      const p1 = shapePoints[index]!
      const p2 = shapePoints[(index + 1) % n]!
      const pixelDist = getImagePixelDistance(p1, p2)
      const distanceCm = (pixelDist / customPxPerMm / 10).toFixed(1)
      result.push({
        index,
        p1,
        p2,
        distanceCm,
      })
    }
    return result
  }

  const edges = computed<PolygonEdge[]>(() => calculateEdgesForShape(points.value))

  const selectedEdge = computed(() => {
    if (selectedEdgeIndex.value === null) return null
    return edges.value.find((e) => e.index === selectedEdgeIndex.value) || null
  })

  const selectedLineDistance = computed(() => selectedEdge.value?.distanceCm || null)

  const handleCalibrateLine = (customCm: number) => {
    if (!selectedEdge.value || customCm <= 0) return

    const edge = selectedEdge.value
    const pixelDist = getImagePixelDistance(edge.p1, edge.p2)

    if (pixelDist > 0) {
      pxPerMm.value = pixelDist / (customCm * 10)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target
    const isEditable =
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    if (isEditable) return

    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase()
      if (key === 'z' || key === 'y') {
        e.preventDefault()
        if (drawingPoints.value.length || isInteractiveDragging.value) return

        if (key === 'y' || e.shiftKey) redoPointMove()
        else undoPointMove()
        return
      }
    }

    if (e.key === 'Space' && !isSpacePressed.value) {
      isSpacePressed.value = true
    } else if (e.key === 'Escape') {
      cancelDrawing()
    } else if (e.key === 'Enter') {
      finishDrawing()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      deleteSelected()
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Space') {
      isSpacePressed.value = false
    }
  }

  // for adding a new point
  const previewNeighbors = computed<{ p1: Point2D; p2: Point2D } | null>(() => {
    if (creatingEdgeIndex.value === null) return null
    const n = points.value.length
    if (n === 0) return null
    const p1 = points.value[creatingEdgeIndex.value]
    const p2 = points.value[(creatingEdgeIndex.value + 1) % n]
    if (!p1 || !p2) return null
    return { p1, p2 }
  })

  const handleEdgeMouseDown = (edgeIndex: number, e: MouseEvent) => {
    e.stopPropagation()

    // highlight edge in move mode
    if (isMoveMode.value) {
      selectedEdgeIndex.value = edgeIndex
      selectedPointIndex.value = null
      return
    }

    // else add new point
    if (workspaceRef.value) {
      const clickPoint = workspaceRef.value.getPointFromEvent(e)
      if (clickPoint) {
        creatingEdgeIndex.value = edgeIndex
        previewPoint.value = clickPoint
        selectedEdgeIndex.value = null
        selectedPointIndex.value = null
        dragStartPoints.value = clonePoints(points.value)
      }
    }
  }

  const startCanvasDrag = (e: MouseEvent) => {
    if (e.button === 1 || isMoveMode.value) {
      e.preventDefault()
      e.stopPropagation()
      isDraggingCanvas.value = true
      panStart.value = {
        x: e.clientX - canvasOffset.value.x,
        y: e.clientY - canvasOffset.value.y,
      }
    }
  }

  const startDragPoint = (index: number, e: MouseEvent) => {
    if (isMoveMode.value) return
    e.stopPropagation()
    // moving point
    selectedPointIndex.value = index
    selectedEdgeIndex.value = null
    draggingPointIndex.value = index
    dragStartPoints.value = clonePoints(points.value)
  }

  // any move
  const handleGlobalMouseMove = (e: MouseEvent) => {
    // moving canvas
    if (isDraggingCanvas.value) {
      canvasOffset.value = {
        x: e.clientX - panStart.value.x,
        y: e.clientY - panStart.value.y,
      }
      return
    }

    if (
      (drawingPoints.value.length > 0 || creatingEdgeIndex.value !== null) &&
      workspaceRef.value
    ) {
      const point = workspaceRef.value.getPointFromEvent(e)
      if (point) previewPoint.value = point
      return
    }


    // moving existing point
    if (draggingPointIndex.value !== null && workspaceRef.value) {
      const point = workspaceRef.value.getPointFromEvent(e)
      if (point) points.value[draggingPointIndex.value] = point
    }
  }

  // on right unclick
  const handleGlobalMouseUp = () => {
    // moving view
    if (isDraggingCanvas.value) {
      isDraggingCanvas.value = false
    }

    const wasInteracting = creatingEdgeIndex.value !== null || draggingPointIndex.value !== null

    // inserting new point
    if (creatingEdgeIndex.value !== null && previewPoint.value) {
      const insertIdx = creatingEdgeIndex.value + 1
      const beforePoints = dragStartPoints.value ?? clonePoints(points.value)

      points.value.splice(insertIdx, 0, previewPoint.value)
      selectedPointIndex.value = insertIdx
      selectedEdgeIndex.value = null
      creatingEdgeIndex.value = null
      previewPoint.value = null

      recordPointChange(beforePoints, points.value)
      dragStartPoints.value = null
    }

    // finish moving a point
    if (draggingPointIndex.value !== null) {
      if (dragStartPoints.value) {
        recordPointChange(dragStartPoints.value, points.value)
      }
      draggingPointIndex.value = null
      dragStartPoints.value = null
    }

    // Prevent background click event right after interaction
    if (wasInteracting) {
      justFinishedInteraction = true
      setTimeout(() => {
        justFinishedInteraction = false
      }, 50)
    }
  }

  const handleRotate = (dir: 'cw' | 'ccw') => {
    const delta = dir === 'cw' ? 90 : -90
    imageRotation.value += delta

    const newAngle = (threadAngle.value + delta + 360) % 360
    threadAngle.value = newAngle
    onThreadAngleChange?.(newAngle)
  }

  const resetCanvasPosition = () => {
    canvasOffset.value = { x: 0, y: 0 }
  }

  const resetAll = () => {
    const beforeReset = clonePoints(points.value)
    cancelDrawing()
    points.value = clonePoints(originalPoints.value)
    selectedEdgeIndex.value = null
    selectedPointIndex.value = null
    creatingEdgeIndex.value = null
    previewPoint.value = null
    dragStartPoints.value = null
    resetCanvasPosition()
    recordPointChange(beforeReset, points.value)
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    window.removeEventListener('mousemove', handleGlobalMouseMove)
    window.removeEventListener('mouseup', handleGlobalMouseUp)
  })

  return {
    points,
    edges,
    selectedEdgeIndex,
    selectedPointIndex,
    selectedEdge,
    selectedLineDistance,
    previewPoint,
    previewNeighbors,
    isInteractiveDragging,
    pxPerMm,
    zoomLevel,
    imageRotation,
    threadAngle,
    activeTool,
    canvasOffset,
    isMoveMode,
    isDraggingCanvas,
    canDelete,
    drawingPoints,
    isNearStartPoint,
    handleImageClick,
    finishDrawing,
    cancelDrawing,
    calculateEdgesForShape,
    handleEdgeMouseDown,
    handleRotate,
    handleCalibrateLine,
    startCanvasDrag,
    startDragPoint,
    resetCanvasPosition,
    deleteSelected,
    resetAll,
    updateOriginalPoints,
    setImageDimensions,
    recordAction,
    undoPointMove,
    redoPointMove,
  }
}
