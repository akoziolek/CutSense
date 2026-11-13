<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePatternAddingStore } from '@/stores/addingPatternStore'
import { useSpatialWorkspace } from '@/composables/useSpatialWorkspace'
import SpatialWorkspace from '@/components/spatial/SpatialWorkspace.vue'
import PatternConfigSidebar from '@/components/patterns/new/PatternConfigSidebar.vue'
import PatternPhotosSidebar from '@/components/patterns/new/PatternPhotosSidebar.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/api/client'
import { Loader2 } from 'lucide-vue-next'
import type { Point2D, PolygonEdge } from '@/types/geometry'

interface ShapeAnalysisResponse {
  shapes: Point2D[][]
  imageWidth: number
  imageHeight: number
}

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const patternStore = usePatternAddingStore()
const { t } = useI18n()
const workspaceRef = ref<InstanceType<typeof SpatialWorkspace> | null>(null)

const activePhotoIndex = ref(0)
const activeShapeIndex = ref(0)
const hoveredShapeIndex = ref<number | null>(null)

const isErrorModalOpen = ref(false)
const analysisError = ref('')

const currentPhotoConfig = computed(() => patternStore.photoConfigs[activePhotoIndex.value] || null)
const currentShapes = computed(() => currentPhotoConfig.value?.shapes || [])
const currentHiddenShapes = computed(() => currentPhotoConfig.value?.hiddenShapes || [])

let isSyncing = false
let currentSyncedPhotoIndex = 0
let currentSyncedShapeIndex = 0

const handleShapeCreated = (newShapePoints: Point2D[]) => {
  const photoIdx = activePhotoIndex.value
  const shapeId = crypto.randomUUID()
  const addedShapeIndex = patternStore.addShape(photoIdx, newShapePoints, shapeId)

  if (typeof addedShapeIndex === 'number') {
    let shapeIdx = addedShapeIndex
    const shapePoints = JSON.parse(JSON.stringify(newShapePoints))

    const doAdd = () => {
      if (patternStore.findShapeIndex(photoIdx, shapeId) === -1) {
        patternStore.insertShapeAtIndex(photoIdx, shapeIdx, shapePoints, shapeId)
      }
      shapeIdx = patternStore.findShapeIndex(photoIdx, shapeId)
      activePhotoIndex.value = photoIdx
      activeShapeIndex.value = shapeIdx
      syncWorkspaceState()
    }

    const doRemove = () => {
      const removedIndex = patternStore.removeShapeById(photoIdx, shapeId)
      if (photoIdx === activePhotoIndex.value) {
        const remainingShapes = patternStore.photoConfigs[photoIdx]?.shapes.length || 0
        activeShapeIndex.value = Math.max(
          0,
          Math.min((removedIndex ?? shapeIdx) - 1, remainingShapes - 1),
        )
        syncWorkspaceState()
      }
    }

    activePhotoIndex.value = photoIdx
    activeShapeIndex.value = shapeIdx
    syncWorkspaceState()

    return {
      undo: doRemove,
      redo: doAdd,
    }
  }
}

const onUpdateShapePoints = (newPoints: Point2D[]) => {
  patternStore.updateShapePoints(activePhotoIndex.value, activeShapeIndex.value, newPoints)
}

const onRestoreTarget = (photoIndex: number, shapeId: string, restoredPoints: Point2D[]) => {
  const shapeIndex = patternStore.findShapeIndex(photoIndex, shapeId)
  if (shapeIndex < 0) return

  activePhotoIndex.value = photoIndex
  activeShapeIndex.value = shapeIndex
  void patternStore.updateShapePoints(photoIndex, shapeIndex, restoredPoints)
  syncWorkspaceState()
}

const {
  points,
  selectedEdgeIndex,
  selectedPointIndex,
  selectedLineDistance,
  canDelete,
  previewPoint,
  previewNeighbors,
  isInteractiveDragging,
  pxPerMm,
  zoomLevel,
  imageRotation,
  activeTool,
  canvasOffset,
  isMoveMode,
  isDraggingCanvas,
  drawingPoints,
  isNearStartPoint,
  handleImageClick,
  calculateEdgesForShape,
  handleEdgeMouseDown,
  handleRotate,
  handleCalibrateLine,
  startCanvasDrag,
  startDragPoint,
  deleteSelected,
  resetAll,
  updateOriginalPoints,
  setImageDimensions,
  cancelDrawing,
  recordAction,
} = useSpatialWorkspace({
  workspaceRef,
  getCurrentTarget: () => {
    const shapeId = patternStore.getShapeId(activePhotoIndex.value, activeShapeIndex.value)
    return shapeId ? { photoIndex: activePhotoIndex.value, shapeId } : null
  },
  onUpdateShapePoints,
  onRestoreTarget,
  initialPxPerMm: currentPhotoConfig.value?.pxPerMm || 1,
  initialPoints: currentShapes.value[activeShapeIndex.value] || [],
  onShapeCreated: handleShapeCreated,
  allowMultipleShapes: true,
})

const handleActivateShape = (shapeIndex: number) => {
  if (drawingPoints.value.length > 0) {
    cancelDrawing()
  }
  if (shapeIndex !== activeShapeIndex.value) {
    activeShapeIndex.value = shapeIndex
    syncWorkspaceState()
  }
}

const allWorkspaceShapes = computed(() => {
  return currentShapes.value.map((shape, idx) =>
    idx === activeShapeIndex.value ? points.value : shape,
  )
})

const allShapesEdges = computed<PolygonEdge[][]>(() => {
  return allWorkspaceShapes.value.map((shape) => calculateEdgesForShape(shape, pxPerMm.value))
})

const isCurrentPhotoReady = computed(() => {
  const config = currentPhotoConfig.value
  return Boolean(config && !config.isAnalyzing)
})

const syncWorkspaceState = () => {
  isSyncing = true
  currentSyncedPhotoIndex = activePhotoIndex.value
  currentSyncedShapeIndex = activeShapeIndex.value

  const photoConfig = patternStore.photoConfigs[activePhotoIndex.value]
  if (!photoConfig || !photoConfig.shapes || photoConfig.shapes.length === 0) {
    points.value = []
    updateOriginalPoints([])
    isSyncing = false
    return
  }

  const activeShapePoints =
    photoConfig.shapes[activeShapeIndex.value] || photoConfig.shapes[0] || []
  if (activeShapePoints.length >= 3) {
    const cloned = JSON.parse(JSON.stringify(activeShapePoints))
    points.value = cloned
    updateOriginalPoints(cloned)
  } else {
    points.value = []
    updateOriginalPoints([])
  }

  if (photoConfig.pxPerMm && photoConfig.pxPerMm > 0) {
    pxPerMm.value = photoConfig.pxPerMm
  }
  if (typeof photoConfig.rotation === 'number') {
    imageRotation.value = photoConfig.rotation
  }

  selectedEdgeIndex.value = null
  selectedPointIndex.value = null

  void nextTick(() => {
    void nextTick(() => {
      isSyncing = false
    })
  })
}

const detectPatternBoundary = async (photoIndex: number) => {
  const file = patternStore.photos[photoIndex]
  if (!file) return

  const photoConfig = patternStore.photoConfigs[photoIndex]
  if (photoConfig?.isAnalyzed || photoConfig?.isAnalyzing) return

  patternStore.setPhotoAnalyzing(photoIndex, true)

  try {
    const formData = new FormData()
    formData.append('picture', file)

    const result = await api<ShapeAnalysisResponse>('/patterns/analyze-boundary', {
      method: 'POST',
      body: formData,
    })

    if (
      !result.shapes ||
      result.shapes.length === 0 ||
      !result.shapes[0] ||
      result.shapes[0].length < 3 ||
      !Number.isFinite(result.imageWidth) ||
      result.imageWidth <= 0 ||
      !Number.isFinite(result.imageHeight) ||
      result.imageHeight <= 0
    ) {
      throw new Error('Invalid boundary returned.')
    }

    await patternStore.updatePhotoDimensions(photoIndex, result.imageWidth, result.imageHeight)
    patternStore.setPhotoShapes(photoIndex, result.shapes)

    if (photoIndex === activePhotoIndex.value) {
      syncWorkspaceState()
    }
  } catch (error) {
    console.error(`Failed to analyze photo #${photoIndex + 1}:`, error)
    patternStore.setPhotoAnalyzing(photoIndex, false)
    if (photoIndex === activePhotoIndex.value) {
      analysisError.value =
        error instanceof ApiError ? error.body.message : t('patterns.analysisFailed')
      isErrorModalOpen.value = true
    }
  }
}

const analyzeAllPhotosInBackground = () => {
  if (!patternStore.isHydrated) return
  patternStore.photos.forEach((_, idx) => {
    void detectPatternBoundary(idx)
  })
}

const selectPhotoAndShape = (photoIndex: number, shapeIndex = 0) => {
  activePhotoIndex.value = photoIndex
  activeShapeIndex.value = shapeIndex
  syncWorkspaceState()
}

const handleToggleVisibility = (photoIndex: number, shapeIndex: number) => {
  patternStore.toggleShapeVisibility(photoIndex, shapeIndex)
}

const handleDeleteShape = (photoIdx: number, shapeIdx: number) => {
  const photoConfig = patternStore.photoConfigs[photoIdx]
  const shapePoints = photoConfig?.shapes[shapeIdx]
  const shapeId = patternStore.getShapeId(photoIdx, shapeIdx)
  if (!shapePoints || shapePoints.length < 3 || !shapeId) return

  const deletedPoints = JSON.parse(JSON.stringify(shapePoints))

  const doDelete = () => {
    const removedIndex = patternStore.removeShapeById(photoIdx, shapeId)
    if (photoIdx === activePhotoIndex.value) {
      const remainingShapes = patternStore.photoConfigs[photoIdx]?.shapes.length || 0
      if (remainingShapes === 0) {
        activeShapeIndex.value = 0
      } else if (activeShapeIndex.value >= (removedIndex ?? shapeIdx)) {
        activeShapeIndex.value = Math.max(
          0,
          Math.min((removedIndex ?? shapeIdx) - 1, remainingShapes - 1),
        )
      }
      syncWorkspaceState()
    }
  }

  const doRestore = () => {
    patternStore.insertShapeAtIndex(photoIdx, shapeIdx, deletedPoints, shapeId)
    activePhotoIndex.value = photoIdx
    activeShapeIndex.value = patternStore.findShapeIndex(photoIdx, shapeId)
    syncWorkspaceState()
  }

  doDelete()
  recordAction({
    undo: doRestore,
    redo: doDelete,
  })
}

const handleDeleteSelected = () => {
  deleteSelected(() => handleDeleteShape(activePhotoIndex.value, activeShapeIndex.value))
}

const handleActivateAndDragPoint = ({
  shapeIndex,
  pointIndex,
  event,
}: {
  shapeIndex: number
  pointIndex: number
  event: MouseEvent
}) => {
  handleActivateShape(shapeIndex)
  startDragPoint(pointIndex, event)
}

const handleActivateAndSelectEdge = ({
  shapeIndex,
  edgeIndex,
  event,
}: {
  shapeIndex: number
  edgeIndex: number
  event: MouseEvent
}) => {
  handleActivateShape(shapeIndex)
  handleEdgeMouseDown(edgeIndex, event)
}

watch(
  points,
  (newPoints) => {
    if (!patternStore.isHydrated || isSyncing || isInteractiveDragging.value) return
    if (
      currentSyncedPhotoIndex === activePhotoIndex.value &&
      currentSyncedShapeIndex === activeShapeIndex.value &&
      newPoints.length >= 3
    ) {
      patternStore.updateShapePoints(activePhotoIndex.value, activeShapeIndex.value, newPoints)
    }
  },
  { deep: true },
)

watch(pxPerMm, (newPxPerMm) => {
  if (!patternStore.isHydrated || isSyncing) return
  patternStore.updatePhotoScale(activePhotoIndex.value, newPxPerMm)
})

watch(imageRotation, (newRotation) => {
  if (!patternStore.isHydrated || isSyncing) return
  patternStore.updatePhotoRotation(activePhotoIndex.value, newRotation)
})

watch(
  () => patternStore.isHydrated,
  (hydrated) => {
    if (hydrated) {
      syncWorkspaceState()
      analyzeAllPhotosInBackground()
    }
  },
  { immediate: true },
)

const handleImageLoaded = (image?: HTMLImageElement) => {
  if (!image) return
  const imageWidth = image.naturalWidth || image.clientWidth
  const imageHeight = image.naturalHeight || image.clientHeight
  setImageDimensions(imageWidth, imageHeight)
  void patternStore
    .updatePhotoDimensions(activePhotoIndex.value, imageWidth, imageHeight)
    .catch((error: unknown) => {
      console.error('Failed to persist pattern image dimensions:', error)
    })
}

onMounted(() => {
  if (patternStore.isHydrated) {
    syncWorkspaceState()
    analyzeAllPhotosInBackground()
  }
})
</script>

<template>
  <div>
    <div v-if="!isCurrentPhotoReady" role="status" aria-live="polite">
      <p class="mb-3 text-sm font-inter text-muted-foreground flex items-center gap-2">
        <Loader2 class="w-4 h-4 animate-spin text-primary" />
        {{ $t('patterns.detectingBoundaries', { number: activePhotoIndex + 1 }) }}
      </p>
      <div class="flex flex-col lg:flex-row items-start gap-6">
        <Skeleton class="w-full h-[520px] rounded-md" />
        <div class="w-full lg:w-80 space-y-4">
          <Skeleton class="h-24 w-full" />
          <Skeleton class="h-24 w-full" />
          <Skeleton class="h-36 w-full" />
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col lg:flex-row items-start gap-4">
      <PatternPhotosSidebar
        :preview-urls="patternStore.previewUrls"
        :photos="patternStore.photos"
        :photo-configs="patternStore.photoConfigs"
        :active-photo-index="activePhotoIndex"
        :active-shape-index="activeShapeIndex"
        @select-photo-and-shape="selectPhotoAndShape"
        @toggle-visibility="handleToggleVisibility"
        @hover-shape="(shapeIdx) => (hoveredShapeIndex = shapeIdx)"
      />

      <div class="flex-1 w-full">
        <SpatialWorkspace
          ref="workspaceRef"
          v-model:active-tool="activeTool"
          v-model:zoom-level="zoomLevel"
          v-model:canvas-offset="canvasOffset"
          :image-url="patternStore.previewUrls[activePhotoIndex]"
          :shapes="allWorkspaceShapes"
          :hidden-shapes="currentHiddenShapes"
          :active-shape-index="activeShapeIndex"
          :hovered-shape-index="hoveredShapeIndex"
          :all-shapes-edges="allShapesEdges"
          :preview-point="previewPoint"
          :preview-neighbors="previewNeighbors"
          :selected-edge-index="selectedEdgeIndex"
          :selected-point-index="selectedPointIndex"
          :can-delete="canDelete"
          :rotation="imageRotation"
          :is-move-mode="isMoveMode"
          :is-dragging-canvas="isDraggingCanvas"
          :is-interactive-dragging="isInteractiveDragging"
          :show-label-toggle="false"
          :drawing-points="drawingPoints"
          :is-near-start-point="isNearStartPoint"
          @activate-shape="handleActivateShape"
          @activate-and-drag-point="handleActivateAndDragPoint"
          @activate-and-select-edge="handleActivateAndSelectEdge"
          @delete-selected="handleDeleteSelected"
          @image-click="handleImageClick"
          @image-loaded="handleImageLoaded"
          @canvas-drag-start="startCanvasDrag"
        />
      </div>

      <PatternConfigSidebar
        v-model:zoomLevel="zoomLevel"
        :selected-line-distance="selectedLineDistance"
        :has-selected-line="selectedEdgeIndex !== null"
        @calibrateLine="handleCalibrateLine"
        @rotate="handleRotate"
        @resetLines="resetAll"
      />

      <FormFloatingActions
        :cancel-label="$t('common.actions.cancel')"
        :next-label="$t('common.actions.next')"
        :disabled="pxPerMm <= 0 || points.length === 0"
        @cancel="emit('cancel')"
        @next="emit('next')"
      />
    </div>

    <BaseModal
      :title="$t('patterns.imageProcessError')"
      :description="$t('patterns.imageProcessDescription')"
      :open="isErrorModalOpen"
      :confirm-label="$t('common.actions.gotIt')"
      fullWidthButton
      @confirm="isErrorModalOpen = false"
    />
  </div>
</template>
