import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { clampPanOffset } from '@/utils/geometry'

export interface CanvasViewportOptions {
  minZoom?: number | Ref<number>
  maxZoom?: number
  wheelZoomStep?: number
  buttonZoomStep?: number
  canStartDrag?: (e: MouseEvent) => boolean
  getMaxOffset?: (zoom: number) => { x: number; y: number }
  onTransformChange?: () => void
}

export function useCanvasViewport(options: CanvasViewportOptions = {}) {
  const maxZoom = options.maxZoom ?? 3.5
  const wheelZoomStep = options.wheelZoomStep ?? 0.08
  const buttonZoomStep = options.buttonZoomStep ?? 0.2
  const canStartDrag = options.canStartDrag ?? ((e: MouseEvent) => e.button === 0 || e.button === 1)

  const minZoom = computed(() =>
    typeof options.minZoom === 'number' ? options.minZoom : (options.minZoom?.value ?? 0.3),
  )

  const zoomLevel = ref(1)
  const canvasOffset = ref({ x: 0, y: 0 })
  const isDragging = ref(false)
  const didDrag = ref(false)
  const dragOrigin = ref({ x: 0, y: 0 })
  const dragStart = ref({ x: 0, y: 0 })

  const clampOffset = (x: number, y: number, zoom = zoomLevel.value) => {
    if (!options.getMaxOffset) return { x, y }
    return clampPanOffset({ x, y }, options.getMaxOffset(zoom))
  }

  const setZoom = (nextZoom: number) => {
    const clamped = Math.min(Math.max(minZoom.value, Number(nextZoom.toFixed(2))), maxZoom)
    zoomLevel.value = clamped
    canvasOffset.value = clampOffset(canvasOffset.value.x, canvasOffset.value.y, clamped)
    options.onTransformChange?.()
  }

  const zoomIn = () => setZoom(zoomLevel.value + buttonZoomStep)
  const zoomOut = () => setZoom(zoomLevel.value - buttonZoomStep)

  const resetView = () => {
    zoomLevel.value = 1
    canvasOffset.value = { x: 0, y: 0 }
    options.onTransformChange?.()
  }

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey) {
      const delta = e.deltaY < 0 ? wheelZoomStep : -wheelZoomStep
      setZoom(zoomLevel.value + delta)
    } else {
      canvasOffset.value = clampOffset(
        canvasOffset.value.x - e.deltaX,
        canvasOffset.value.y - e.deltaY,
      )
      options.onTransformChange?.()
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (canStartDrag(e)) {
      isDragging.value = true
      didDrag.value = false
      dragOrigin.value = { x: e.clientX, y: e.clientY }
      dragStart.value = {
        x: e.clientX - canvasOffset.value.x,
        y: e.clientY - canvasOffset.value.y,
      }
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return
    if (Math.hypot(e.clientX - dragOrigin.value.x, e.clientY - dragOrigin.value.y) > 3) {
      didDrag.value = true
    }
    canvasOffset.value = clampOffset(e.clientX - dragStart.value.x, e.clientY - dragStart.value.y)
    options.onTransformChange?.()
  }

  const stopDragging = () => {
    isDragging.value = false
  }

  onMounted(() => window.addEventListener('mouseup', stopDragging))
  onUnmounted(() => window.removeEventListener('mouseup', stopDragging))

  return {
    zoomLevel,
    canvasOffset,
    isDragging,
    didDrag,
    minZoom,
    maxZoom,
    clampOffset,
    setZoom,
    zoomIn,
    zoomOut,
    resetView,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    stopDragging,
  }
}
