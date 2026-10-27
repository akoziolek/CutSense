<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import { useSpatialWorkspace } from '@/composables/useSpatialWorkspace'
import FabricConfigSidebar from '@/components/fabrics/FabricConfigSidebar.vue'
import SpatialWorkspace from '@/components/spatial/SpatialWorkspace.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/api/client'
import BaseModal from '@/components/common/BaseModal.vue'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const wizardStore = useFabricAddingStore()
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
  pxPerCm,
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
  initialPxPerCm: wizardStore.config.pxPerCm,
  initialPoints: wizardStore.config.points,
  currentThreadAngle: ref(wizardStore.config.threadAngle),
})

const loadSavedConfig = () => {
  if (!wizardStore.isHydrated) return
  isSyncing = true

  if (wizardStore.config.points && wizardStore.config.points.length >= 3) {
    const savedPoints = JSON.parse(JSON.stringify(wizardStore.config.points))
    points.value = savedPoints
    updateOriginalPoints(savedPoints)
  }
  if (wizardStore.config.pxPerCm) {
    pxPerCm.value = wizardStore.config.pxPerCm
  }
  if (typeof wizardStore.config.threadAngle === 'number') {
    threadAngle.value = wizardStore.config.threadAngle
  }
  if (typeof wizardStore.config.rotation === 'number') {
    imageRotation.value = wizardStore.config.rotation
  }

  setTimeout(() => {
    isSyncing = false
  }, 50)
}

const detectFabricBoundary = async () => {
  const picture = wizardStore.file
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
    const result = await api<{
      points: { pctX: number; pctY: number }[]
      imageWidth: number
      imageHeight: number
    }>('/fabrics/analyze-boundary', {
      method: 'POST',
      body: formData,
    })

    if (result.imageWidth <= 0 || result.imageHeight <= 0 || result.points.length < 3) {
      throw new Error('Shape analysis returned an invalid boundary.')
    }

    isSyncing = true
    points.value = result.points
    updateOriginalPoints(result.points)
    await wizardStore.updateConfig({
      points: result.points,
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

  void wizardStore
    .updateConfig({ imageWidth: realWidth, imageHeight: realHeight })
    .catch((error: unknown) => {
      console.error('Failed to persist fabric image dimensions:', error)
    })
}

const handleSubmit = async () => {
  if (!wizardStore.file) {
    toast.error('Fabric photo is not ready. Please try again.')
    return
  }

  try {
    await wizardStore.updateConfig(
      {
        points: JSON.parse(JSON.stringify(points.value)),
        pxPerCm: pxPerCm.value,
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
  if (!wizardStore.isHydrated) return

  if (wizardStore.config.points && wizardStore.config.points.length >= 3) {
    loadSavedConfig()
    return
  }

  await detectFabricBoundary()
}

watch(
  () => wizardStore.isHydrated,
  (hydrated) => {
    if (hydrated) {
      void initializeBoundary()
    }
  },
  { immediate: true },
)

watch(
  [points, pxPerCm, threadAngle, imageRotation, isInteractiveDragging],
  () => {
    if (!wizardStore.isHydrated || isSyncing || isInteractiveDragging.value) return
    void wizardStore
      .updateConfig({
        points: JSON.parse(JSON.stringify(points.value)),
        pxPerCm: pxPerCm.value,
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
  if (wizardStore.isHydrated) {
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
        :image-url="wizardStore.previewUrl"
        :points="points"
        :edges="edges"
        :preview-point="previewPoint"
        :preview-neighbors="previewNeighbors"
        :selected-edge-index="selectedEdgeIndex"
        :selected-point-index="selectedPointIndex"
        :can-delete="canDelete"
        :rotation="imageRotation"
        :is-move-mode="isMoveMode"
        :is-dragging-canvas="isDraggingCanvas"
        :is-interactive-dragging="isInteractiveDragging"
        @select-edge="handleEdgeMouseDown"
        @select-point="
          (idx) => {
            selectedPointIndex = idx
            selectedEdgeIndex = null
          }
        "
        @start-drag-point="startDragPoint"
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
      :disabled="isAnalyzing || pxPerCm <= 0"
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