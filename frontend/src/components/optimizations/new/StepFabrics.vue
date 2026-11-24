<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Point2D } from '@/types/geometry'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const tab = ref(store.fabricPool.length ? 'existing' : 'custom')

const size = reactive({ width: '', height: '' })
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
  assign(store.addCustomFabric(size.width, size.height))
  size.width = size.height = ''
}

const libraryPick = ref<SelectedItem | null>(null)
const assignLibrary = () => {
  if (!libraryPick.value || !hasSelection.value) return
  assign(store.addLibraryFabric(libraryPick.value))
  libraryPick.value = null
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

        <Card class="space-y-3 border-muted p-4 shadow-xs">
          <h2 class="text-sm font-bold font-inter">
            2. Choose fabric for
            {{ hasSelection ? `${selected.length} selected piece(s)` : 'the selected pieces' }}
          </h2>

          <Tabs v-model="tab" class="h-[26rem]">
            <div class="flex items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="existing" :disabled="!store.fabricPool.length">
                  Used in this run
                </TabsTrigger>
                <TabsTrigger value="custom">{{ t('optimizations.customDimensions') }}</TabsTrigger>
                <TabsTrigger v-if="isLoggedIn" value="library">
                  {{ t('optimizations.fabricLibrary') }}
                </TabsTrigger>
              </TabsList>

              <Button
                v-if="tab === 'custom'"
                type="button"
                size="sm"
                class="shrink-0 whitespace-nowrap"
                :disabled="!canAddCustom"
                @click="assignCustom"
              >
                Use for selected pieces
              </Button>
              <Button
                v-else-if="tab === 'library'"
                type="button"
                size="sm"
                class="shrink-0 whitespace-nowrap"
                :disabled="!libraryPick || !hasSelection"
                @click="assignLibrary"
              >
                Use for selected pieces
              </Button>
            </div>

            <TabsContent value="existing" class="min-h-0 overflow-y-auto space-y-2">
              <Button
                v-for="(f, i) in store.fabricPool"
                :key="f.key"
                type="button"
                variant="outline"
                class="mr-2 h-auto py-2 text-xs"
                :disabled="!hasSelection"
                @click="assign(f.key)"
              >
                {{ i + 1 }}. {{ fabricLabel(f) }}
              </Button>
            </TabsContent>

            <TabsContent value="custom" class="h-full min-h-0 overflow-y-auto p-1">
              <div class="grid h-full grid-cols-1 gap-6 sm:grid-cols-2 sm:items-stretch">
                <div class="flex max-w-md flex-col justify-between gap-4">
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

                    <p v-if="sizeInvalid" class="text-xs text-destructive" role="alert">
                      {{
                        t('optimizations.sizeRangeError', {
                          min: MIN_FABRIC_SIDE_CM,
                          max: MAX_FABRIC_SIDE_CM,
                        })
                      }}
                    </p>
                  </div>

                  <p class="text-xs text-muted-foreground">
                    Every custom size you add is a separate sheet with its own layout.
                  </p>
                </div>

                <div
                  class="flex h-full min-h-48 items-center justify-center rounded-md border border-muted bg-muted/20 p-4"
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
            </TabsContent>

            <TabsContent
              v-if="isLoggedIn"
              value="library"
              class="flex min-h-0 flex-col gap-3 overflow-hidden"
            >
              <div class="min-h-0 flex-1 overflow-y-auto p-1.5">
                <FabricLibraryPicker
                  :selected-id="libraryPick?.id ?? null"
                  @select="(fabric) => (libraryPick = fabric)"
                />
              </div>
            </TabsContent>
          </Tabs>

          <p v-if="!hasSelection" class="text-xs text-muted-foreground">
            Select at least one piece above first.
          </p>
        </Card>
      </div>

      <FabricGroupsPanel @select-group="selectGroup" />
    </div>

    <FormFloatingActions
      :cancel-label="t('common.actions.cancel')"
      :next-label="t('common.actions.next')"
      :disabled="!store.piecesAssigned"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>