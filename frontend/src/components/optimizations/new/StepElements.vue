<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorState from '@/components/common/ErrorState.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import AllowancesPanel from '@/components/optimizations/new/AllowancesPanel.vue'
import OptimizationPieceCard from '@/components/optimizations/new/OptimizationPieceCard.vue'
import { api, ApiError } from '@/api/client'
import type {
  OptimizationDefaults,
  PatternDetails,
  PatternPieceDefaults,
} from '@/types/optimization'
import type { Point2D } from '@/types/geometry'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { mmToCm } from '@/utils/optimizationConfig'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()
const { t } = useI18n()

const patternPieces = ref<PatternPieceDefaults[]>([])
const patternDetails = ref<PatternDetails | null>(null)
const isLoading = ref(true)
const loadError = ref('')

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
    const points = piece.points.map(([x, y]) => ({
      pctX: (x / imageWidth) * 100,
      pctY: ((imageHeight - y) / imageHeight) * 100,
    }))
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

const load = async () => {
  const pattern = store.pattern
  if (!pattern) return
  isLoading.value = true
  loadError.value = ''
  try {
    const [details, defaults] = await Promise.all([
      api<PatternDetails>(`/patterns/${pattern.id}`),
      api<OptimizationDefaults>('/optimizations/defaults'),
    ])
    patternPieces.value = details.pieces
    patternDetails.value = details

    if (store.piecesPatternId !== pattern.id) store.initPieces(pattern.id, details.pieces)
    if (store.seamAllowanceCm === '') store.seamAllowanceCm = mmToCm(defaults.seamAllowanceMm)
    if (store.cuttingAllowanceCm === '')
      store.cuttingAllowanceCm = mmToCm(defaults.cuttingAllowanceMm)
  } catch (e) {
    loadError.value =
      e instanceof ApiError ? e.body.message : t('optimizations.patternLoadFailed')
  } finally {
    isLoading.value = false
  }
}

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

    <ErrorState v-else-if="loadError" :title="$t('optimizations.unableToLoadPattern')" :message="loadError" :code="$t('common.errors.errorCode')">
      <template #actions>
        <Button variant="outline" class="rounded-lg gap-2" @click="load">
          <RotateCcw class="w-4 h-4" />
          <span>{{ $t('common.actions.tryAgain') }}</span>
        </Button>
        <Button variant="default" class="rounded-lg gap-2" @click="emit('cancel')">
          <ArrowLeft class="w-4 h-4" />
          <span>{{ $t('common.actions.back') }}</span>
        </Button>
      </template>
    </ErrorState>

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

      <AllowancesPanel v-model:seam="store.seamAllowanceCm" v-model:cutting="store.cuttingAllowanceCm" />
    </div>

    <FormFloatingActions
      :cancel-label="$t('common.actions.cancel')"
      :next-label="$t('common.actions.next')"
      :disabled="isLoading || !!loadError || !store.canSubmit"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>
