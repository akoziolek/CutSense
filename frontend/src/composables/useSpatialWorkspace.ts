import { ref, computed, watch, nextTick, onMounted, onUnmounted, type Ref } from 'vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'

interface SpatialWorkspaceExposed {
  imgRef: HTMLImageElement | null | undefined
  svgRef: SVGSVGElement | null | undefined
  getPointFromEvent: (e: MouseEvent) => Point2D | null
}

// input type
interface useSpatialWorkspaceOptions {
  workspaceRef: Ref<SpatialWorkspaceExposed | null>
  initialPxPerCm?: number
  initialPoints?: Point2D[]
  onThreadAngleChange?: (newAngle: number) => void
  currentThreadAngle?: Ref<number>
}

export function useSpatialWorkspace(options: useSpatialWorkspaceOptions) {
  const defaultPxPerCm = 10
  const {
    workspaceRef,
    initialPxPerCm,
    initialPoints,
    onThreadAngleChange,
    currentThreadAngle,
  } = options

  const backupShape = [
    { pctX: 20, pctY: 20 },
    { pctX: 80, pctY: 20 },
    { pctX: 80, pctY: 80 },
    { pctX: 20, pctY: 80 },
  ]
  // how many px per 1 cm
  const pxPerCm = ref<number>(initialPxPerCm && initialPxPerCm > 0 ? initialPxPerCm : defaultPxPerCm)
  // postgis format
  const points = ref<Point2D[]>(
    initialPoints && initialPoints.length >= 3 ? initialPoints : backupShape,
  )
  const originalPoints = ref<Point2D[]>(JSON.parse(JSON.stringify(points.value)))

  const updateOriginalPoints = (newPoints: Point2D[]) => {
    originalPoints.value = JSON.parse(JSON.stringify(newPoints))
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
  let justDragged = false

  const isMoveMode = computed(() => isSpacePressed.value || activeTool.value === 'pan')

  const canDelete = computed(() => {
    const numPoints = points.value.length

    if (selectedPointIndex.value !== null) {
      return numPoints > 3
    }

    if (selectedEdgeIndex.value !== null) {
      return numPoints >= 5
    }

    return false
  })

  const edges = computed<PolygonEdge[]>(() => {
    const n = points.value.length
    if (n < 2) return []

    const result: PolygonEdge[] = []
    for (let index = 0; index < n; index++) {
      const p1 = points.value[index]
      const p2 = points.value[(index + 1) % n]
      if (p1 && p2) {
        result.push({
          index,
          p1,
          p2,
          distanceCm: calculateEdgeDistance(p1, p2),
        })
      }
    }
    return result
  })

  const deleteSelected = () => {
    if (!canDelete.value) return

    // deleting point
    if (selectedPointIndex.value !== null) {
      points.value.splice(selectedPointIndex.value, 1)
    }
    // deleting edge - both points
    else if (selectedEdgeIndex.value !== null) {
      const edgeIdx = selectedEdgeIndex.value
      const numPoints = points.value.length

      const p1Idx = edgeIdx
      const p2Idx = (edgeIdx + 1) % numPoints

      // deleting point from the end/start
      if (p2Idx === 0) {
        points.value.splice(numPoints - 1, 1)
        points.value.splice(0, 1)
      }
      //deleting normal point
      else {
        points.value.splice(p1Idx, 2)
      }
    }

    selectedPointIndex.value = null
    selectedEdgeIndex.value = null
    updateEdgeDistances()
  }

  // delete with Delete / Backspace
  const handleKeyDown = (e: KeyboardEvent) => {
    const isInput = (e.target as HTMLElement).tagName === 'INPUT'
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
      e.preventDefault()
      deleteSelected()
    }
  }

  const isInteractiveDragging = computed(
    () => creatingEdgeIndex.value !== null || draggingPointIndex.value !== null,
  )

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

  const getImagePixelDistance = (p1: Point2D, p2: Point2D): number => {
    const img = workspaceRef.value?.imgRef
    if (!img) return 0

    const width = img.clientWidth || img.naturalWidth || 100
    const height = img.clientHeight || img.naturalHeight || 100

    const dx = ((p2.pctX - p1.pctX) / 100) * width
    const dy = ((p2.pctY - p1.pctY) / 100) * height

    // Pythagoras
    return Math.hypot(dx, dy)
  }

  const calculateEdgeDistance = (p1: Point2D, p2: Point2D): string => {
    if (pxPerCm.value <= 0) return '0.0'
    const pixelDist = getImagePixelDistance(p1, p2)
    return (pixelDist / pxPerCm.value).toFixed(1)
  }

  const handleCalibrateLine = (customCm: number) => {
    if (!selectedEdge.value || customCm <= 0) return

    const edge = selectedEdge.value
    const pixelDist = getImagePixelDistance(edge.p1, edge.p2)

    if (pixelDist > 0) {
      pxPerCm.value = pixelDist / customCm
      updateEdgeDistances()
    }
  }

  const selectedEdge = computed(() => {
    if (selectedEdgeIndex.value === null) return null
    return edges.value.find((e) => e.index === selectedEdgeIndex.value) || null
  })

  const selectedLineDistance = computed(() => selectedEdge.value?.distanceCm || null)

  const updateEdgeDistances = () => {
    nextTick(() => {
      points.value = [...points.value]
    })
  }

  watch(
    () => [workspaceRef.value?.svgRef, pxPerCm.value],
    () => {
      updateEdgeDistances()
    },
    { immediate: true, deep: true },
  )

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

    // new point preview - update its placement
    if (creatingEdgeIndex.value !== null && workspaceRef.value) {
      const point = workspaceRef.value.getPointFromEvent(e)
      if (point) {
        previewPoint.value = point
      }
      return
    }

    // moving existing point
    if (draggingPointIndex.value !== null && workspaceRef.value) {
      const point = workspaceRef.value.getPointFromEvent(e)
      if (point) {
        points.value[draggingPointIndex.value] = point
        updateEdgeDistances()
      }
    }
  }

  // on right unclick
  const handleGlobalMouseUp = () => {
    // moving view
    if (isDraggingCanvas.value) {
      isDraggingCanvas.value = false
      justDragged = true
      setTimeout(() => (justDragged = false), 100)
    }

    // inserting new point
    if (creatingEdgeIndex.value !== null && previewPoint.value) {
      const insertIdx = creatingEdgeIndex.value + 1
      points.value.splice(insertIdx, 0, previewPoint.value)
      selectedPointIndex.value = insertIdx
      selectedEdgeIndex.value = null

      creatingEdgeIndex.value = null
      previewPoint.value = null
      justDragged = true
      updateEdgeDistances()
      setTimeout(() => (justDragged = false), 100)
    }

    // finish moving a point
    if (draggingPointIndex.value !== null) {
      justDragged = true
      draggingPointIndex.value = null
      setTimeout(() => (justDragged = false), 100)
    }
  }

  const handleRotate = (dir: 'cw' | 'ccw') => {
    const delta = dir === 'cw' ? 90 : -90
    imageRotation.value += delta

    const newAngle = (threadAngle.value + delta + 360) % 360
    threadAngle.value = newAngle

    if (onThreadAngleChange) {
      onThreadAngleChange(newAngle)
    }

    updateEdgeDistances()
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      isSpacePressed.value = false
    }
  }

  const resetCanvasPosition = () => {
    canvasOffset.value = { x: 0, y: 0 }
  }

  const resetAll = () => {
    points.value = JSON.parse(JSON.stringify(originalPoints.value))
    selectedEdgeIndex.value = null
    selectedPointIndex.value = null
    creatingEdgeIndex.value = null
    previewPoint.value = null
    resetCanvasPosition()
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    nextTick(() => {
      setTimeout(() => updateEdgeDistances(), 100)
      setTimeout(() => updateEdgeDistances(), 300)
    })
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
    pxPerCm,
    zoomLevel,
    imageRotation,
    threadAngle,
    activeTool,
    canvasOffset,
    isMoveMode,
    isDraggingCanvas,
    canDelete,
    handleEdgeMouseDown,
    handleRotate,
    handleCalibrateLine,
    updateEdgeDistances,
    startCanvasDrag,
    startDragPoint,
    resetCanvasPosition,
    deleteSelected,
    resetAll,
    updateOriginalPoints,
  }
}
