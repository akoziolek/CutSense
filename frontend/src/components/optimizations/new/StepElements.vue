<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowLeft, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorState from '@/components/common/ErrorState.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import AllowancesPanel from '@/components/optimizations/new/AllowancesPanel.vue'
import OptimizationPieceCard from '@/components/optimizations/new/OptimizationPieceCard.vue'
import { api, ApiError } from '@/api/client'
import type { OptimizationDefaults, PatternPieceDefaults } from '@/types/optimization'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { mmToCm } from '@/utils/optimizationConfig'
import type { PieceImageSource } from '@/types/geometry'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()

const patternPieces = ref<PatternPieceDefaults[]>([])
const isLoading = ref(true)
const loadError = ref('')

const pointsById = computed(() => new Map(patternPieces.value.map((p) => [p.id, p.points])))


const patternImages = ref<(PieceImageSource & { id: number })[]>([])

const piecesById = computed(() => new Map(patternPieces.value.map((p) => [p.id, p])))
const imagesById = computed(() => new Map(patternImages.value.map((i) => [i.id, i])))

// "Piece #1", and "Piece #1.1", "Piece #1.2" for its copies
const labeledPieces = computed(() => {
  const order = new Map<number, number>()
  const copies = new Map<number, number>()
  return store.pieces.map((piece) => {
    if (!order.has(piece.patternPieceId)) order.set(piece.patternPieceId, order.size + 1)
    const copy = copies.get(piece.patternPieceId) ?? 0
    copies.set(piece.patternPieceId, copy + 1)
    const number = order.get(piece.patternPieceId)!
    const source = piecesById.value.get(piece.patternPieceId)
    return {
      piece,
      label: copy === 0 ? `Piece #${number}` : `Piece #${number}.${copy}`,
      points: source?.points ?? [],
      image: source ? imagesById.value.get(source.patternImageId) : undefined,
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
      api<{
        id: number
        pieces: PatternPieceDefaults[]
        images: (PieceImageSource & { id: number })[]
      }>(`/patterns/${pattern.id}`),
      api<OptimizationDefaults>('/optimizations/defaults'),
    ])
    patternPieces.value = details.pieces
    patternImages.value = details.images

    if (store.piecesPatternId !== pattern.id) store.initPieces(pattern.id, details.pieces)
    if (store.seamAllowanceCm === '') store.seamAllowanceCm = mmToCm(defaults.seamAllowanceMm)
    if (store.cuttingAllowanceCm === '')
      store.cuttingAllowanceCm = mmToCm(defaults.cuttingAllowanceMm)
  } catch (e) {
    loadError.value =
      e instanceof ApiError ? e.body.message : 'Could not load the pattern. Please try again.'
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

    <ErrorState v-else-if="loadError" title="Unable to load the pattern" :message="loadError" code="Error">
      <template #actions>
        <Button variant="outline" class="rounded-lg gap-2" @click="load">
          <RotateCcw class="w-4 h-4" />
          <span>Try again</span>
        </Button>
        <Button variant="default" class="rounded-lg gap-2" @click="emit('cancel')">
          <ArrowLeft class="w-4 h-4" />
          <span>Back</span>
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
          :image="item.image"
          :can-delete="store.pieces.length > 1"
          @update="(partial) => store.updatePiece(item.piece.key, partial)"
          @duplicate="store.duplicatePiece(item.piece.key)"
          @remove="store.removePiece(item.piece.key)"
        />
      </div>

      <AllowancesPanel v-model:seam="store.seamAllowanceCm" v-model:cutting="store.cuttingAllowanceCm" />
    </div>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Next"
      :disabled="isLoading || !!loadError || !store.canSubmit"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>
