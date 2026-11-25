<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Point2D } from '@/types/geometry'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SidebarThreadDirection from '@/components/spatial/sidebar/SidebarThreadDirection.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import PieceSelectCard from '@/components/optimizations/new/PieceSelectCard.vue'
import FabricGroupsPanel from '@/components/optimizations/new/FabricGroupsPanel.vue'
import FabricLibraryPicker from '@/components/optimizations/new/FabricLibraryPicker.vue'
import { useOptimizationSetup } from '@/composables/wizards/useOptimizationWizard'
import { useAuth } from '@/stores/authStore'
import { fabricLabel, useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import type { SelectedItem } from '@/types/optimization'
import { toImagePercent } from '@/utils/geometry'
import {
  MAX_FABRIC_SIDE_CM,
  MIN_FABRIC_SIDE_CM,
  isValidFabricSideCm,
  parseCm
} from '@/utils/optimizationConfig'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()
const { state } = useAuth()
const { t } = useI18n()
const isLoggedIn = computed(() => state.user !== null)
const {
  patternPieces,
  patternDetails,
  load,
  loadError: patternLoadError,
} = useOptimizationSetup()
onMounted(load)

const previewsById = computed(() => {
  if (!patternDetails.value) return new Map()

  const imagesById = new Map(patternDetails.value.images.map((image) => [image.id, image]))
  const shapesByImage = new Map<number, Point2D[][]>()
  const shapeIndexes = new Map<number, number>()

  for (const piece of patternPieces.value) {
    const image = imagesById.get(piece.patternImageId)
    if (!image) continue

    const imageWidth = image.imageWidthMm || 1
    const imageHeight = image.imageHeightMm || 1
    const points = piece.points.map((point) => toImagePercent(point, imageWidth, imageHeight))
    const imageShapes = shapesByImage.get(image.id) ?? []

    shapeIndexes.set(piece.id, imageShapes.length)
    imageShapes.push(points)
    shapesByImage.set(image.id, imageShapes)
  }

  return new Map(
    patternPieces.value.flatMap((piece) => {
      const image = imagesById.get(piece.patternImageId)
      const shapeIndex = shapeIndexes.get(piece.id)
      const allShapes = shapesByImage.get(piece.patternImageId)
      if (!image || shapeIndex === undefined || !allShapes) return []

      return [
        [
          piece.id,
          {
            imageUrl: image.url,
            points: allShapes[shapeIndex]!,
            shapeIndex,
            allShapes,
          },
        ],
      ]
    }),
  )
})

// ---------- 1. pieces ----------
const selected = ref<string[]>([])
const hasSelection = computed(() => selected.value.length > 0)
const isSelected = (key: string) => selected.value.includes(key)
const toggle = (key: string) =>
  (selected.value = isSelected(key)
    ? selected.value.filter((k) => k !== key)
    : [...selected.value, key])
const selectAll = () => (selected.value = store.pieces.map((p) => p.key))
const selectUnassigned = () =>
  (selected.value = store.pieces.filter((p) => !p.fabricKey).map((p) => p.key))
const clearSelection = () => (selected.value = [])
const selectGroup = (keys: string[]) => (selected.value = [...keys])

const unassignedCount = computed(() => store.pieces.filter((p) => !p.fabricKey).length)

const labelOfFabric = (fabricKey: string | null) => {
  const fabric = store.fabricPool.find((f) => f.key === fabricKey)
  return fabric ? fabricLabel(fabric) : undefined
}

// ---------- 2. fabric ----------
const assign = (fabricKey: string) => {
  store.assignPieces(selected.value, fabricKey)
  clearSelection()
}

const size = reactive({ width: '', height: '' })
const customGrainline = ref(0)
const sizeFields = [
  { id: 'fabric-height', label: 'Height', key: 'height', placeholder: 'e.g. 290' },
  { id: 'fabric-width', label: 'Width', key: 'width', placeholder: 'e.g. 145' },
] as const

const sizeInvalid = computed(
  () =>
    (size.width !== '' && !isValidFabricSideCm(size.width)) ||
    (size.height !== '' && !isValidFabricSideCm(size.height)),
)
const customPreview = computed(() => {
  if (!isValidFabricSideCm(size.width) || !isValidFabricSideCm(size.height)) return null
  const w = parseCm(size.width)
  const h = parseCm(size.height)
  if (w === null || h === null) return null
  return { w, h }
})
const canAddCustom = computed(
  () => hasSelection.value && isValidFabricSideCm(size.width) && isValidFabricSideCm(size.height),
)
const assignCustom = () => {
  if (!canAddCustom.value) return
  assign(store.addCustomFabric(size.width, size.height, customGrainline.value))
  size.width = size.height = ''
  customGrainline.value = 0
  fabricDialogView.value = null
}

const libraryPick = ref<SelectedItem | null>(null)
const fabricDialogView = ref<'source' | 'custom' | 'library' | null>(null)
const fabricDialogOpen = computed(() => fabricDialogView.value !== null)
const openFabricDialog = () => {
  if (hasSelection.value) fabricDialogView.value = 'source'
}
const setFabricDialogOpen = (open: boolean) => {
  if (!open) fabricDialogView.value = null
}
const assignLibrary = () => {
  if (!libraryPick.value || !hasSelection.value) return
  assign(store.addLibraryFabric(libraryPick.value))
  libraryPick.value = null
  fabricDialogView.value = null
}
</script>

<template>
  <div class="space-y-6 pb-24">
    <p class="text-sm text-muted-foreground">
      Select the pieces that will be cut from the same fabric, then choose that fabric. Repeat for
      the remaining pieces. Each fabric gets its own layout.
    </p>

    <div class="flex flex-col items-start gap-6 lg:flex-row">
      <div class="w-full min-w-0 flex-1 space-y-6">
        <section class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="mr-auto text-sm font-bold font-inter">
              1. Select pieces
              <span class="ml-2 text-xs font-normal text-muted-foreground">
                {{ selected.length }} selected · {{ unassignedCount }} without fabric
              </span>
            </h2>
            <Button type="button" variant="outline" size="sm" class="text-xs" @click="selectAll">
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-xs"
              :disabled="!unassignedCount"
              @click="selectUnassigned"
            >
              Select unassigned
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="text-xs"
              :disabled="!hasSelection"
              @click="clearSelection"
            >
              Clear
            </Button>
          </div>

          <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            <PieceSelectCard
              v-for="item in store.numberedPieces"
              :key="item.piece.key"
              :label="
                t('optimizations.pieceLabel', {
                  number: item.number,
                  copy: item.copy ? `.${item.copy}` : '',
                })
              "
              :points="item.points"
              :preview="previewsById.get(item.piece.patternPieceId)"
              :normal-count="item.piece.normalCount"
              :mirrored-count="item.piece.mirroredCount"
              :fabric-label="labelOfFabric(item.piece.fabricKey)"
              :selected="isSelected(item.piece.key)"
              @toggle="toggle(item.piece.key)"
            />
          </div>
          <p v-if="patternLoadError" class="text-xs text-destructive" role="alert">
            {{ patternLoadError }}
          </p>
        </section>

      </div>

      <FabricGroupsPanel
        :can-add-fabric="hasSelection"
        @select-group="selectGroup"
        @add-fabric="openFabricDialog"
      />
    </div>

    <Dialog :open="fabricDialogOpen" @update:open="setFabricDialogOpen">
      <DialogContent
        :class="
          fabricDialogView === 'source'
            ? 'max-w-lg'
            : 'h-[85vh] w-[92vw] max-h-[calc(100vh-2rem)] max-w-none sm:max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden'
        "
      >
        <DialogHeader>
          <DialogTitle>
            <template v-if="fabricDialogView === 'source'">Add fabric</template>
            <template v-else-if="fabricDialogView === 'custom'">
              Custom dimensions for {{ selected.length }} selected piece(s)
            </template>
            <template v-else>Choose fabric for {{ selected.length }} selected piece(s)</template>
          </DialogTitle>
          <DialogDescription v-if="fabricDialogView === 'source'">
            Choose a custom fabric size or select a fabric from your library.
          </DialogDescription>
          <DialogDescription v-else-if="fabricDialogView === 'custom'">
            Every custom size you add is a separate sheet with its own layout.
          </DialogDescription>
          <DialogDescription v-else>
            Select a fabric from your library to assign it to the selected pieces.
          </DialogDescription>
        </DialogHeader>

        <div v-if="fabricDialogView === 'source'" class="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            class="h-auto w-full min-w-0 justify-start whitespace-normal py-4 text-left"
            @click="fabricDialogView = 'custom'"
          >
            <span class="min-w-0 whitespace-normal">
              <span class="block font-semibold">{{ t('optimizations.customDimensions') }}</span>
              <span
                class="mt-1 block whitespace-normal break-words text-xs font-normal text-muted-foreground"
              >
                Enter the width and height of a custom fabric.
              </span>
            </span>
          </Button>
          <Button
            v-if="isLoggedIn"
            type="button"
            variant="outline"
            class="h-auto w-full min-w-0 justify-start whitespace-normal py-4 text-left"
            @click="fabricDialogView = 'library'"
          >
            <span class="min-w-0 whitespace-normal">
              <span class="block font-semibold">{{ t('optimizations.fabricLibrary') }}</span>
              <span
                class="mt-1 block whitespace-normal break-words text-xs font-normal text-muted-foreground"
              >
                Choose an existing fabric from your library.
              </span>
            </span>
          </Button>
        </div>

        <div
          v-else-if="fabricDialogView === 'custom'"
          class="flex min-h-0 flex-col gap-5 overflow-hidden"
        >
          <div class="grid min-h-0 flex-1 gap-6 sm:grid-cols-2 sm:items-stretch">
            <div class="space-y-3">
              <div v-for="field in sizeFields" :key="field.id" class="space-y-1">
                <Label :for="field.id" class="text-xs font-medium text-muted-foreground">
                  {{ field.label }}
                </Label>
                <div class="relative">
                  <Input
                    :id="field.id"
                    type="number"
                    step="0.1"
                    :min="MIN_FABRIC_SIDE_CM"
                    :max="MAX_FABRIC_SIDE_CM"
                    :placeholder="field.placeholder"
                    :model-value="size[field.key]"
                    class="h-9 pr-10 text-sm"
                    @update:model-value="(v: string | number) => (size[field.key] = String(v ?? ''))"
                    @keyup.enter="assignCustom"
                  />
                  <span
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                    >cm</span
                  >
                </div>
              </div>
              <SidebarThreadDirection
                :thread-angle="customGrainline"
                :title="t('optimizations.fabricGrainline')"
                @update:thread-angle="(angle: number) => (customGrainline = angle)"
              />
              <p v-if="sizeInvalid" class="text-xs text-destructive" role="alert">
                {{
                  t('optimizations.sizeRangeError', {
                    min: MIN_FABRIC_SIDE_CM,
                    max: MAX_FABRIC_SIDE_CM,
                  })
                }}
              </p>
            </div>

            <div
              class="flex min-h-0 items-center justify-center rounded-md border border-muted bg-muted/20 p-4"
            >
              <svg
                v-if="customPreview"
                :viewBox="`0 0 ${customPreview.w} ${customPreview.h}`"
                preserveAspectRatio="xMidYMid meet"
                class="h-full w-full"
                role="img"
                :aria-label="
                  t('optimizations.fabricPreview', {
                    width: customPreview.w,
                    height: customPreview.h,
                  })
                "
              >
                <rect
                  x="0"
                  y="0"
                  :width="customPreview.w"
                  :height="customPreview.h"
                  class="fill-muted stroke-foreground"
                  stroke-width="2"
                  vector-effect="non-scaling-stroke"
                />
              </svg>
              <p v-else class="text-xs text-muted-foreground">
                {{ t('optimizations.enterFabricSize') }}
              </p>
            </div>
          </div>

          <div class="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              class="border-black"
              @click="fabricDialogView = 'source'"
            >
              Back
            </Button>
            <Button type="button" :disabled="!canAddCustom" @click="assignCustom">
              OK
            </Button>
          </div>
        </div>

        <div
          v-else-if="fabricDialogView === 'library'"
          class="flex min-h-0 flex-col gap-4 overflow-hidden"
        >
          <div class="min-h-0 flex-1 overflow-y-auto p-1">
            <FabricLibraryPicker
              :selected-id="libraryPick?.id ?? null"
              @select="(fabric) => (libraryPick = fabric)"
            />
          </div>
          <div class="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              class="border-black"
              @click="fabricDialogView = 'source'"
            >
              Back
            </Button>
            <Button
              type="button"
              :disabled="!libraryPick || !hasSelection"
              @click="assignLibrary"
            >
              OK
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <FormFloatingActions
      :cancel-label="t('common.actions.cancel')"
      :next-label="t('common.actions.next')"
      :disabled="!store.piecesAssigned"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>