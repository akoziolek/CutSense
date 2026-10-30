<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ImagePreview from '@/components/common/ImagePreview.vue'
import DetailsCard, { type MetaItem } from '@/components/common/DetailsCard.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { CalendarDays, RulerDimensionLine, ArrowLeft, RotateCcw } from 'lucide-vue-next'
import { api, ApiError } from '@/api/client'
import DetailsActions from '@/components/common/DetailsActions.vue'
import type { NameTag } from '@/types/fabric'
import type { PolygonEdge } from '@/types/geometry'
import { toImagePercentBoundary, type CartesianPoint } from '@/utils/fabricBoundary'
import { useFavouriteToggle } from '@/composables/useFavouriteToggle'
import FavouriteButton from '@/components/common/FavouriteButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { useDeleteFabric } from '@/composables/fabrics/useDeleteFabric'

interface Fabric {
  id: number
  name: string
  description?: string
  pictureUrl?: string
  tags: NameTag[]
  createdAt: string
  area: number
  boundary: CartesianPoint[]
  imageWidthCm?: number
  imageHeightCm?: number
  isFavourite: boolean
  optimizationCount: number
}

const props = defineProps<{ id: string }>()

const fabric = ref<Fabric | null>(null)
const isFetching = ref(true)
const showSkeleton = ref(false)
const error = ref('')

const { confirmOpen, successOpen, isDeleting, error: deleteError, request: requestDelete,
  confirm: confirmDelete, closeSuccess } = useDeleteFabric(() => props.id)

let skeletonTimer: ReturnType<typeof setTimeout> | null = null

const clearSkeletonTimer = () => {
  if (skeletonTimer) {
    clearTimeout(skeletonTimer)
    skeletonTimer = null
  }
}

const normalizedPoints = computed(() => {
  if (
    !fabric.value ||
    fabric.value.imageWidthCm === undefined ||
    fabric.value.imageHeightCm === undefined
  ) {
    return []
  }

  return toImagePercentBoundary(
    fabric.value.boundary,
    fabric.value.imageWidthCm,
    fabric.value.imageHeightCm,
  )
})

const edges = computed<PolygonEdge[]>(() => {
  const pts = normalizedPoints.value
  if (pts.length < 2) return []

  const imageWidthCm = fabric.value?.imageWidthCm ?? 0
  const imageHeightCm = fabric.value?.imageHeightCm ?? 0

  return pts.map((p1, index) => {
    const p2 = pts[(index + 1) % pts.length]!

    const dx = ((p2.pctX - p1.pctX) / 100) * imageWidthCm
    const dy = ((p2.pctY - p1.pctY) / 100) * imageHeightCm
    const distanceCm = Math.hypot(dx, dy).toFixed(1).toString()

    return {
      index,
      p1,
      p2,
      distanceCm,
    }
  })
})

const metaItems = computed<MetaItem[]>(() =>
  fabric.value
    ? [
        {
          icon: CalendarDays,
          label: 'Added',
          value: new Date(fabric.value.createdAt).toLocaleDateString(),
        },
        {
          icon: RulerDimensionLine,
          label: 'Area',
          value: `${(fabric.value.area / 10000).toFixed(2)} m²`,
        },
      ]
    : [],
)

const fetchFabric = async (id: string, activeSignal = { active: true }) => {
  clearSkeletonTimer()
  fabric.value = null
  error.value = ''
  isFetching.value = true
  showSkeleton.value = false

  skeletonTimer = setTimeout(() => {
    if (activeSignal.active && isFetching.value) {
      showSkeleton.value = true
    }
  }, 150)

  try {
    const result = await api<Fabric>(`/fabrics/${encodeURIComponent(id)}`)
    if (activeSignal.active) fabric.value = result
  } catch (e) {
    if (activeSignal.active) {
      error.value =
        e instanceof ApiError ? e.body.message : 'Could not load fabric. Please try again.'
    }
  } finally {
    if (activeSignal.active) {
      isFetching.value = false
      showSkeleton.value = false
      clearSkeletonTimer()
    }
  }
}

const { toggle: toggleFavourite, pending } = useFavouriteToggle()

watch(
  () => props.id,
  (id, _, onCleanup) => {
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    fetchFabric(id, activeSignal)
  },
  { immediate: true },
)
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader :title="fabric?.name ?? (isFetching ? '' : 'Fabric details')">
        <template #actions>
          <div class="flex items-center gap-2">
            <FavouriteButton
              v-if="fabric"
              :is-favourite="fabric.isFavourite"
              :disabled="pending.has(fabric.id)"
              @toggle="toggleFavourite(fabric)"
            />
            <DetailsActions 
              :edit-to="{ name: 'FabricEdit', params: { id: props.id } }" 
              @delete="requestDelete"  
            />
          </div>
        </template>
      </PageHeader>

      <Transition
        mode="out-in"
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <main
          v-if="showSkeleton"
          key="skeleton"
          class="grid grid-cols-1 md:grid-cols-5 gap-8 items-start"
        >
          <div class="w-full aspect-square max-h-[500px] md:col-span-2">
            <Skeleton class="w-full h-full rounded-lg" />
          </div>
          <div class="md:col-span-3 space-y-4">
            <Skeleton class="h-8 w-1/3" />
            <Skeleton class="h-20 w-full" />
            <div class="flex gap-2">
              <Skeleton class="h-6 w-16" />
              <Skeleton class="h-6 w-16" />
            </div>
          </div>
        </main>

        <main v-else-if="error" key="error">
          <ErrorState title="Unable to load fabric" :message="error" code="Error">
            <template #actions>
              <Button variant="outline" class="rounded-lg gap-2" @click="fetchFabric(props.id)">
                <RotateCcw class="w-4 h-4" />
                <span>Try again</span>
              </Button>
              <Button as-child variant="default" class="rounded-lg gap-2">
                <RouterLink to="/fabrics">
                  <ArrowLeft class="w-4 h-4" />
                  <span>Back to fabrics</span>
                </RouterLink>
              </Button>
            </template>
          </ErrorState>
        </main>

        <main
          v-else-if="fabric"
          key="content"
          class="grid grid-cols-1 md:grid-cols-5 gap-8 items-start"
        >
          <div class="md:col-span-2">
            <div class="w-full aspect-square max-h-[500px]">
              <ImagePreview
                v-if="fabric.pictureUrl"
                :src="fabric.pictureUrl"
                :alt="fabric.name"
                :points="normalizedPoints"
                :edges="edges"
              />
              <div
                v-else
                class="flex h-full items-center justify-center rounded-md bg-muted text-muted-foreground"
              >
                No fabric image available
              </div>
            </div>
            <p
              v-if="fabric.boundary?.length > 0 && normalizedPoints?.length === 0"
              class="mt-2 text-sm text-muted-foreground"
            >
              Boundary preview is unavailable because calibrated image dimensions are missing.
            </p>
          </div>

          <div class="md:col-span-3">
            <DetailsCard
              :description="fabric.description"
              :tags="fabric.tags"
              :meta-items="metaItems"
            />
          </div>
        </main>
      </Transition>
    </div>

    <!-- confirm deletion -->
    <BaseModal
      :open="confirmOpen"
      :title="`Delete ${fabric?.name ?? 'this fabric'}?`"
      description="This action cannot be undone and will permanently remove all associated optimizations."
      @update:open="(open: boolean) => { if (!isDeleting) confirmOpen = open }"
    >
      <p v-if="deleteError" class="text-sm font-semibold text-destructive" role="alert">
        {{ deleteError }}
      </p>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            class="h-9 rounded-lg text-xs sm:text-sm font-semibold border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
            :disabled="isDeleting"
            @click="confirmOpen = false"
          >
            Cancel
          </Button>
          <Button
            type="button"
            class="h-9 rounded-lg px-4 text-xs sm:text-sm font-semibold font-inter bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
            :disabled="isDeleting"
            @click="confirmDelete"
          >
            Delete
          </Button>
        </div>
      </template>
    </BaseModal>

    <!-- success -->
    <BaseModal
      :open="successOpen"
      title="Fabric deleted"
      description="The fabric and its optimizations were deleted."
      confirm-label="Got it"
      prevent-close
      @confirm="closeSuccess"
    />
  </GridLayout>
</template>
