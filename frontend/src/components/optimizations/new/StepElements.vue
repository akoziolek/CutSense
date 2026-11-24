<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorState from '@/components/common/ErrorState.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import AllowancesPanel from '@/components/optimizations/new/AllowancesPanel.vue'
import OptimizationPieceCard from '@/components/optimizations/new/OptimizationPieceCard.vue'
import type { Point2D } from '@/types/geometry'
import { toImagePercent } from '@/utils/geometry'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { useOptimizationSetup } from '@/composables/wizards/useOptimizationWizard'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()
const { patternPieces, patternDetails, isLoading, loadError, load } = useOptimizationSetup()
const { t } = useI18n()

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

// "Piece #1", and "Piece #1.1", "Piece #1.2" for its copies
const labeledPieces = computed(() => {
  const order = new Map<number, number>()
  const copies = new Map<number, number>()
  return store.pieces.map((piece) => {
    if (!order.has(piece.patternPieceId)) order.set(piece.patternPieceId, order.size + 1)
    const copy = copies.get(piece.patternPieceId) ?? 0
    copies.set(piece.patternPieceId, copy + 1)
    const number = order.get(piece.patternPieceId)!
    return {
      piece,
      label: t('optimizations.pieceLabel', { number, copy: copy ? `.${copy}` : '' }),
      ...previewsById.value.get(piece.patternPieceId),
    }
  })
})

onMounted(load)
</script>

<template>
  <div class="pb-24">
    <div v-if="isLoading" class="flex flex-col items-start gap-6 lg:flex-row" role="status">
      <div class="w-full flex-1 space-y-4">
        <Skeleton v-for="n in 2" :key="n" class="h-48 w-full rounded-md" />
      </div>
      <Skeleton class="h-48 w-full rounded-md lg:w-80" />
    </div>

    <ErrorState
      v-else-if="loadError"
      :title="$t('optimizations.unableToLoadPattern')"
      :message="loadError"
      :code="$t('common.errors.errorCode')"
      :retry-label="$t('common.actions.tryAgain')"
      :back-label="$t('common.actions.back')"
      @retry="load"
      @back="emit('cancel')"
    />

    <div v-else class="flex flex-col items-start gap-6 lg:flex-row">
      <div class="w-full min-w-0 flex-1 space-y-4">
        <OptimizationPieceCard
          v-for="item in labeledPieces"
          :key="item.piece.key"
          :piece="item.piece"
          :label="item.label"
          :points="item.points"
          :image-url="item.imageUrl"
          :shape-index="item.shapeIndex"
          :all-shapes="item.allShapes"
          :can-delete="store.pieces.length > 1"
          @update="(partial) => store.updatePiece(item.piece.key, partial)"
          @duplicate="store.duplicatePiece(item.piece.key)"
          @remove="store.removePiece(item.piece.key)"
        />
      </div>

      <AllowancesPanel
        v-model:seam="store.seamAllowanceCm"
        v-model:cutting="store.cuttingAllowanceCm"
      />
    </div>

    <FormFloatingActions
      :cancel-label="$t('common.actions.cancel')"
      :next-label="$t('common.actions.next')"
      :disabled="isLoading || !!loadError || !store.elementsValid"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>