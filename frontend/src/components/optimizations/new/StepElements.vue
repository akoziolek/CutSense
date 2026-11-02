<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
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

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()
const router = useRouter()

const patternPieces = ref<PatternPieceDefaults[]>([])
const isLoading = ref(true)
const loadError = ref('')
const isSubmitting = ref(false)
const submitError = ref('')

const pointsById = computed(() => new Map(patternPieces.value.map((p) => [p.id, p.points])))

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
      label: copy === 0 ? `Piece #${number}` : `Piece #${number}.${copy}`,
      points: pointsById.value.get(piece.patternPieceId) ?? [],
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
      api<{ id: number; pieces: PatternPieceDefaults[] }>(`/patterns/${pattern.id}`),
      api<OptimizationDefaults>('/optimizations/defaults'),
    ])
    patternPieces.value = details.pieces

    // keep what the user already configured when they come back to this step
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

const handleSubmit = async () => {
  if (isSubmitting.value) return
  const payload = store.toPayload()
  if (!payload || !store.canSubmit) {
    submitError.value = 'The configuration is incomplete. Check the highlighted fields.'
    return
  }

  submitError.value = ''
  isSubmitting.value = true
  try {
    await api<{ id: number }>('/optimizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    store.reset()
    toast.success('Optimization saved')
    await router.push({ name: 'Optimizations' })
  } catch (e) {
    submitError.value =
      e instanceof ApiError ? e.body.message : 'Could not save the optimization. Please try again.'
  } finally {
    isSubmitting.value = false
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
          :can-delete="store.pieces.length > 1"
          @update="(partial) => store.updatePiece(item.piece.key, partial)"
          @duplicate="store.duplicatePiece(item.piece.key)"
          @remove="store.removePiece(item.piece.key)"
        />
      </div>

      <AllowancesPanel v-model:seam="store.seamAllowanceCm" v-model:cutting="store.cuttingAllowanceCm" />
    </div>

    <p v-if="submitError" class="mt-4 text-sm font-semibold text-destructive" role="alert">
      {{ submitError }}
    </p>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Optimize"
      :disabled="isLoading || !!loadError || isSubmitting || !store.canSubmit"
      @cancel="emit('cancel')"
      @next="handleSubmit"
    />
  </div>
</template>