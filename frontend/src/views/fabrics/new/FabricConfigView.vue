<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import { useSpatialWorkspace } from '@/composables/useSpatialWorkspace'
import { useAddFabricFormGuard } from '@/composables/useAddFabricFormGuard'
import PageHeader from '@/components/common/PageHeader.vue'
import StepCounter from '@/components/forms/StepCounter.vue'
import FabricConfigSidebar from '@/components/fabrics/FabricConfigSidebar.vue'
import SpatialWorkspace from '@/components/fabrics/SpatialWorkspace.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import DiscardNewFabricModal from '@/components/fabrics/DiscardNewFabricModal.vue'

const wizardStore = useFabricAddingStore()
const workspaceRef = ref<InstanceType<typeof SpatialWorkspace> | null>(null)

const { isCancelModalOpen, handleCancel, confirmExit } = useAddFabricFormGuard()

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
  updateEdgeDistances,
  startCanvasDrag,
  startDragPoint,
  resetCanvasPosition,
  deleteSelected,
  resetAll,
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
    points.value = JSON.parse(JSON.stringify(wizardStore.config.points))
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

  updateEdgeDistances()
  setTimeout(() => {
    isSyncing = false
  }, 50)
}

watch(
  () => wizardStore.isHydrated,
  (hydrated) => {
    if (hydrated) {
      loadSavedConfig()
    }
  },
  { immediate: true },
)

watch(
  [points, pxPerCm, threadAngle, imageRotation],
  () => {
    if (!wizardStore.isHydrated || isSyncing) return

    wizardStore.updateConfig({
      points: JSON.parse(JSON.stringify(points.value)),
      pxPerCm: pxPerCm.value,
      threadAngle: threadAngle.value,
      rotation: imageRotation.value,
    })
  },
  { deep: true },
)

const handleSubmit = () => {
  // next step
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

      <div class="flex flex-col lg:flex-row items-start gap-6">
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
          @image-loaded="updateEdgeDistances"
          @canvas-drag-start="startCanvasDrag"
          @reset-canvas="resetCanvasPosition"
        />

        <FabricConfigSidebar
          v-model:zoomLevel="zoomLevel"
          v-model:threadAngle="threadAngle"
          :selected-line-distance="selectedLineDistance"
          :has-selected-line="selectedEdgeIndex !== null"
          @update:zoomLevel="updateEdgeDistances"
          @calibrateLine="handleCalibrateLine"
          @rotate="handleRotate"
          @resetLines="resetAll"
        />
      </div>
    </div>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Calibrate"
      @cancel="handleCancel"
      @next="handleSubmit"
    />
    <DiscardNewFabricModal
      v-model:open="isCancelModalOpen"
      @confirm="confirmExit"
    />
  </GridLayout>
</template>