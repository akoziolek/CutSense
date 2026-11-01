<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import { useSpatialWorkspace } from '@/composables/useSpatialWorkspace'
import FabricConfigSidebar from '@/components/fabrics/new/FabricConfigSidebar.vue'
import SpatialWorkspace from '@/components/spatial/SpatialWorkspace.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/api/client'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Point2D } from '@/types/geometry'

interface ShapeAnalysisResponse {
  shapes: Point2D[][]
  imageWidth: number
  imageHeight: number
}

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const fabricStore = useFabricAddingStore()
const workspaceRef = ref<InstanceType<typeof SpatialWorkspace> | null>(null)

const isErrorModalOpen = ref(false)
const isAnalyzing = ref(false)
const analysisError = ref('')
let isSyncing = false

const {
  points,
  edges,
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
  threadAngle,
  activeTool,
  canvasOffset,
  isMoveMode,
  isDraggingCanvas,
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
} = useSpatialWorkspace({
  workspaceRef,
  initialPxPerMm: fabricStore.config.pxPerMm,
  initialPoints: fabricStore.config.shapes[0],
  currentThreadAngle: ref(fabricStore.config.threadAngle),
  allowMultipleShapes: false,
})

const loadSavedConfig = () => {
  if (!fabricStore.isHydrated) return
  isSyncing = true

  const savedShape = fabricStore.config.shapes[0]
  if (savedShape && savedShape.length >= 3) {
    const savedPoints = JSON.parse(JSON.stringify(savedShape))
    points.value = savedPoints
    updateOriginalPoints(savedPoints)
  }
  if (fabricStore.config.pxPerMm) {
    pxPerMm.value = fabricStore.config.pxPerMm
  }
  if (typeof fabricStore.config.threadAngle === 'number') {
    threadAngle.value = fabricStore.config.threadAngle
  }
  if (typeof fabricStore.config.rotation === 'number') {
    imageRotation.value = fabricStore.config.rotation
  }

  setTimeout(() => {
    isSyncing = false
  }, 50)
}

const detectFabricBoundary = async () => {
  const picture = fabricStore.file
  if (!picture) {
    analysisError.value = 'Fabric photo is missing. Return to the upload step and select a photo.'
    isErrorModalOpen.value = true
    return
  }

  isAnalyzing.value = true
  analysisError.value = ''
  try {
    const formData = new FormData()
    formData.append('picture', picture)
    const result = await api<ShapeAnalysisResponse>('/fabrics/analyze-boundary', {
      method: 'POST',
      body: formData,
    })

    const [shape] = result.shapes
    if (
      result.imageWidth <= 0 ||
      result.imageHeight <= 0 ||
      result.shapes.length !== 1 ||
      !shape ||
      shape.length < 3
    ) {
      throw new Error('Shape analysis returned an invalid boundary.')
    }

    isSyncing = true
    points.value = shape
    updateOriginalPoints(shape)
    await fabricStore.updateConfig({
      shapes: result.shapes,
    })
  } catch (error) {
    console.error('Failed to analyze fabric photo:', error)
    analysisError.value =
      error instanceof ApiError
        ? error.body.message
        : 'Could not analyze fabric photo. Please try again.'
    isErrorModalOpen.value = true
  } finally {
    setTimeout(() => {
      isSyncing = false
    }, 50)
    isAnalyzing.value = false
  }
}

const handleImageLoaded = (image?: HTMLImageElement) => {
  if (!image) return

  const realWidth = image.naturalWidth || image.clientWidth
  const realHeight = image.naturalHeight || image.clientHeight

  setImageDimensions(realWidth, realHeight)

  void fabricStore
    .updateConfig({ imageWidth: realWidth, imageHeight: realHeight })
    .catch((error: unknown) => {
      console.error('Failed to persist fabric image dimensions:', error)
    })
}

const handleSubmit = async () => {
  if (!fabricStore.file) {
    toast.error('Fabric photo is not ready. Please try again.')
    return
  }

  try {
    await fabricStore.updateConfig(
      {
        shapes: [JSON.parse(JSON.stringify(points.value))],
        pxPerMm: pxPerMm.value,
        threadAngle: threadAngle.value,
        rotation: imageRotation.value,
      },
      true,
    )
    emit('next')
  } catch {
    toast.error('Could not save fabric configuration. Please try again.')
  }
}

const handleConfirm = () => {
  isErrorModalOpen.value = false
}

const initializeBoundary = async () => {
  if (!fabricStore.isHydrated) return

  if (fabricStore.config.shapes[0] && fabricStore.config.shapes[0].length >= 3) {
    loadSavedConfig()
    return
  }

  await detectFabricBoundary()
}

watch(
  () => fabricStore.isHydrated,
  (hydrated) => {
    if (hydrated) {
      void initializeBoundary()
    }
  },
  { immediate: true },
)

watch(
  [points, pxPerMm, threadAngle, imageRotation, isInteractiveDragging],
  () => {
    if (!fabricStore.isHydrated || isSyncing || isInteractiveDragging.value) return
    void fabricStore
      .updateConfig({
        shapes: [JSON.parse(JSON.stringify(points.value))],
        pxPerMm: pxPerMm.value,
        threadAngle: threadAngle.value,
        rotation: imageRotation.value,
      })
      .catch((error: unknown) => {
        console.error('Failed to persist fabric configuration:', error)
      })
  },
  { deep: true },
)

onMounted(() => {
  if (fabricStore.isHydrated) {
    void initializeBoundary()
  }
})
</script>

<template>
  <div>
    <div v-if="isAnalyzing" role="status" aria-live="polite">
      <p class="mb-3 text-sm text-muted-foreground">Detecting fabric outline from the photo...</p>
      <div class="flex flex-col lg:flex-row items-start gap-6">
        <Skeleton class="w-full h-[520px] rounded-md" />
        <div class="w-full lg:w-80 space-y-4">
          <Skeleton class="h-24 w-full" />
          <Skeleton class="h-24 w-full" />
          <Skeleton class="h-36 w-full" />
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col lg:flex-row items-start gap-6">
      <SpatialWorkspace
        ref="workspaceRef"
        v-model:active-tool="activeTool"
        v-model:zoom-level="zoomLevel"
        v-model:canvas-offset="canvasOffset"
        :image-url="fabricStore.previewUrl"
        :shapes="[points]"
        :all-shapes-edges="[edges]"
        :preview-point="previewPoint"
        :preview-neighbors="previewNeighbors"
        :selected-edge-index="selectedEdgeIndex"
        :selected-point-index="selectedPointIndex"
        :can-delete="canDelete"
        :rotation="imageRotation"
        :is-move-mode="isMoveMode"
        :is-dragging-canvas="isDraggingCanvas"
        :is-interactive-dragging="isInteractiveDragging"
        @activate-and-select-edge="
          ({ edgeIndex, event }) => handleEdgeMouseDown(edgeIndex, event)
        "
        @select-point="
          (idx) => {
            selectedPointIndex = idx
            selectedEdgeIndex = null
          }
        "
        @activate-and-drag-point="({ pointIndex, event }) => startDragPoint(pointIndex, event)"
        @delete-selected="deleteSelected"
        @image-loaded="handleImageLoaded"
        @canvas-drag-start="startCanvasDrag"
        @reset-canvas="resetCanvasPosition"
      />

      <FabricConfigSidebar
        v-model:zoomLevel="zoomLevel"
        v-model:threadAngle="threadAngle"
        :selected-line-distance="selectedLineDistance"
        :has-selected-line="selectedEdgeIndex !== null"
        @calibrateLine="handleCalibrateLine"
        @rotate="handleRotate"
        @resetLines="resetAll"
      />
    </div>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Next"
      :disabled="isAnalyzing || pxPerMm <= 0"
      @cancel="emit('cancel')"
      @next="handleSubmit"
    />

    <BaseModal
      title="We couldn't process your image."
      description="Try again later or use the default shape and adjust it manually"
      :open="isErrorModalOpen"
      confirmLabel="I understand"
      fullWidthButton
      @confirm="handleConfirm"
    />
  </div>
</template>
