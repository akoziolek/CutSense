import { ref, computed, watch, isRef, onMounted, onUnmounted, type Ref } from 'vue'
import { clampPanOffset } from '@/utils/geometry'

type MaybeReactive<T> = T | Ref<T> | (() => T)

const resolveValue = <T>(source: MaybeReactive<T>): T => {
  if (typeof source === 'function') return (source as () => T)()
  return isRef(source) ? source.value : source
}

export interface CanvasViewportOptions {
  containerRef?: Ref<HTMLElement | null>
  contentWidth?: MaybeReactive<number>
  contentHeight?: MaybeReactive<number>
  fitPadding?: number
  panOverflowPx?: number
  minZoom?: MaybeReactive<number>
  maxZoom?: number
  defaultZoom?: MaybeReactive<number>
  wheelZoomStep?: number
  buttonZoomStep?: number
  canStartDrag?: (e: MouseEvent) => boolean
  getMaxOffset?: (zoom: number) => { x: number; y: number }
  onTransformChange?: () => void
  onPointerMove?: (clientX: number, clientY: number) => void
  onReset?: () => void
}

export function useCanvasViewport(options: CanvasViewportOptions = {}) {
  const maxZoom = options.maxZoom ?? 3.5
  const wheelZoomStep = options.wheelZoomStep ?? 0.08
  const buttonZoomStep = options.buttonZoomStep ?? 0.2
  const fitPadding = options.fitPadding ?? 0.88
  const panOverflowPx = options.panOverflowPx ?? 30
  const canStartDrag = options.canStartDrag ?? ((e: MouseEvent) => e.button === 0 || e.button === 1)

  const containerSize = ref({ width: 0, height: 0, ready: false })

  const hasAutoFitMetrics = computed(
    () =>
      containerSize.value.ready &&
      options.contentWidth !== undefined &&
      options.contentHeight !== undefined,
  )

  const fitZoom = computed(() => {
    if (!hasAutoFitMetrics.value) return 1
    const cWidth = resolveValue(options.contentWidth!)
    const cHeight = resolveValue(options.contentHeight!)
    if (cWidth <= 0 || cHeight <= 0) return 1

    const fitScale = Math.min(
      containerSize.value.width / cWidth,
      containerSize.value.height / cHeight,
    )
    return Math.min(1.5, Math.max(0.05, Number((fitScale * fitPadding).toFixed(2))))
  })

  const minZoom = computed(() => {
    if (options.minZoom !== undefined) return resolveValue(options.minZoom)
    if (hasAutoFitMetrics.value) {
      return Math.max(0.05, Number((fitZoom.value * 0.5).toFixed(2)))
    }
    return 0.3
  })

  const defaultZoom = computed(() => {
    if (options.defaultZoom !== undefined) return resolveValue(options.defaultZoom)
    return hasAutoFitMetrics.value ? fitZoom.value : 1
  })

  const zoomLevel = ref(defaultZoom.value)
  const canvasOffset = ref({ x: 0, y: 0 })
  const isDragging = ref(false)
  const didDrag = ref(false)
  const hasUserInteracted = ref(false)
  const dragOrigin = ref({ x: 0, y: 0 })
  const dragStart = ref({ x: 0, y: 0 })

  const clampOffset = (x: number, y: number, zoom = zoomLevel.value) => {
    if (options.getMaxOffset) {
      return clampPanOffset({ x, y }, options.getMaxOffset(zoom))
    }
    if (hasAutoFitMetrics.value) {
      const cWidth = resolveValue(options.contentWidth!)
      const cHeight = resolveValue(options.contentHeight!)
      return clampPanOffset(
        { x, y },
        {
          x: Math.max(0, (cWidth * zoom - containerSize.value.width) / 2 + panOverflowPx),
          y: Math.max(0, (cHeight * zoom - containerSize.value.height) / 2 + panOverflowPx),
        },
      )
    }
    return { x, y }
  }

  const applyZoom = (nextZoom: number, markInteracted = true) => {
    const clamped = Math.min(Math.max(minZoom.value, Number(nextZoom.toFixed(2))), maxZoom)
    zoomLevel.value = clamped
    canvasOffset.value = clampOffset(canvasOffset.value.x, canvasOffset.value.y, clamped)
    if (markInteracted) {
      hasUserInteracted.value = true
    }
    options.onTransformChange?.()
  }

  const setZoom = (nextZoom: number) => applyZoom(nextZoom, true)
  const zoomIn = () => applyZoom(zoomLevel.value + buttonZoomStep, true)
  const zoomOut = () => applyZoom(zoomLevel.value - buttonZoomStep, true)

  const resetView = () => {
    hasUserInteracted.value = false
    canvasOffset.value = { x: 0, y: 0 }
    applyZoom(defaultZoom.value, false)
    options.onReset?.()
  }

  watch(defaultZoom, (nextDefault) => {
    if (!hasUserInteracted.value) {
      canvasOffset.value = { x: 0, y: 0 }
      applyZoom(nextDefault, false)
    }
  })

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    hasUserInteracted.value = true
    if (e.ctrlKey) {
      const delta = e.deltaY < 0 ? wheelZoomStep : -wheelZoomStep
      applyZoom(zoomLevel.value + delta, true)
    } else {
      canvasOffset.value = clampOffset(
        canvasOffset.value.x - e.deltaX,
        canvasOffset.value.y - e.deltaY,
      )
      options.onTransformChange?.()
    }
    options.onPointerMove?.(e.clientX, e.clientY)
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
    if (isDragging.value) {
      if (Math.hypot(e.clientX - dragOrigin.value.x, e.clientY - dragOrigin.value.y) > 3) {
        didDrag.value = true
        hasUserInteracted.value = true
      }
      canvasOffset.value = clampOffset(e.clientX - dragStart.value.x, e.clientY - dragStart.value.y)
      options.onTransformChange?.()
    }
    options.onPointerMove?.(e.clientX, e.clientY)
  }

  const stopDragging = () => {
    isDragging.value = false
  }

  let resizeObserver: ResizeObserver | null = null

  const updateContainerSize = () => {
    const el = options.containerRef?.value
    if (!el) return
    const width = el.clientWidth
    const height = el.clientHeight
    if (width > 0 && height > 0) {
      containerSize.value = { width, height, ready: true }
    }
  }

  if (options.containerRef) {
    watch(
      options.containerRef,
      (el) => {
        resizeObserver?.disconnect()
        resizeObserver = null
        if (!el) return
        updateContainerSize()
        resizeObserver = new ResizeObserver(updateContainerSize)
        resizeObserver.observe(el)
      },
      { immediate: true },
    )
  }

  onMounted(() => {
    updateContainerSize()
    window.addEventListener('mouseup', stopDragging)
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    window.removeEventListener('mouseup', stopDragging)
  })

  return {
    containerSize,
    zoomLevel,
    canvasOffset,
    isDragging,
    didDrag,
    hasUserInteracted,
    fitZoom,
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
