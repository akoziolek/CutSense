<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import { useSpatialWorkspace } from '@/composables/useSpatialWorkspace'
import { useAddFabricFormGuard } from '@/composables/fabrics/useAddFabricFormGuard'
import PageHeader from '@/components/common/PageHeader.vue'
import StepCounter from '@/components/forms/StepCounter.vue'
import FabricConfigSidebar from '@/components/fabrics/FabricConfigSidebar.vue'
import SpatialWorkspace from '@/components/fabrics/SpatialWorkspace.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import DiscardNewFabricModal from '@/components/forms/DiscardChangesModal.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/api/client'
import BaseModal from '@/components/common/BaseModal.vue'

const wizardStore = useFabricAddingStore()
const router = useRouter()
const workspaceRef = ref<InstanceType<typeof SpatialWorkspace> | null>(null)

const { isCancelModalOpen, handleCancel, confirmExit } = useAddFabricFormGuard()
const isErrorModalOpen = ref(false)
const isAnalyzing = ref(false)
const analysisError = ref('')


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

let isSyncing = false

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
      initializeBoundary()
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

const handleSubmit = async () => {
  const image = workspaceRef.value?.imgRef
  if (!image || !wizardStore.file) {
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
        imageWidth: image.clientWidth,
        imageHeight: image.clientHeight,
      },
      true,
    )
  } catch {
    toast.error('Could not save fabric configuration. Please try again.')
    return
  }

  await router.push({ name: 'FabricDescription' })
}


const handleConfirm = () => {
  isErrorModalOpen.value = false
}

onMounted(() => {
  if (wizardStore.isHydrated) {
    void initializeBoundary()
  }
})

const handleImageLoaded = () => {
  const image = workspaceRef.value?.imgRef
  if (!image) return

  const realWidth = image.naturalWidth || image.clientWidth
  const realHeight = image.naturalHeight || image.clientHeight

  setImageDimensions(realWidth, realHeight)

  void wizardStore
    .updateConfig({ imageWidth: image.clientWidth, imageHeight: image.clientHeight })
    .catch((error: unknown) => {
      console.error('Failed to persist fabric image dimensions:', error)
    })
}
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader title="Fabric configuration" :show-back="true">
        <template #actions>
          <StepCounter :current-step="2" :total-steps="3" />
        </template>
      </PageHeader>

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
          :image-url="wizardStore.previewUrl"
          :points="points"
          :edges="edges"
          :preview-point="previewPoint"
          :preview-neighbors="previewNeighbors"
          :selected-edge-index="selectedEdgeIndex"
          :selected-point-index="selectedPointIndex"
          :can-delete="canDelete"
          :rotation="imageRotation"
          :canvas-offset="canvasOffset"
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
    </div>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Next"
      :disabled="isAnalyzing || pxPerCm <= 0"
      @cancel="handleCancel"
      @next="handleSubmit"
    />
    <DiscardNewFabricModal v-model:open="isCancelModalOpen" @confirm="confirmExit" />
    <BaseModal
      title="We couldn't process your image."
      :description="`Try again later or use the default shape and adjust it manually`"
      :open="isErrorModalOpen"
      confirmLabel="I understand"
      fullWidthButton
      v-on:confirm="handleConfirm"
    />
  </GridLayout>
</template>
