<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DetailsCard, { type MetaItem } from '@/components/common/DetailsCard.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  CalendarDays,
  RulerDimensionLine,
  Lock,
  Globe,
  ArrowLeft,
  RotateCcw,
} from 'lucide-vue-next'
import { api, ApiError } from '@/api/client'
import PatternPiecesCarousel, {
  type PatternPiece,
} from '@/components/patterns/PatternPiecesCarousel.vue'
import type { NameTag } from '@/types/fabric'
import DetailsActions from '@/components/common/DetailsActions.vue'
import { useAuth } from '@/composables/useAuth'
import { useFavouriteToggle } from '@/composables/useFavouriteToggle'
import FavouriteButton from '@/components/common/FavouriteButton.vue'
import DeleteDialogs from '@/components/common/DeleteDialogs.vue'
import { useDeleteResource } from '@/composables/useDeleteResource'
import PatternPieceCard from '@/components/patterns/PatternPieceCard.vue'

interface Pattern {
  id: number
  userId: number
  name: string
  description?: string
  size: string
  visibility: 'PUBLIC' | 'PRIVATE'
  starCount: number
  starAverage: string
  tags: NameTag[]
  createdAt: string
  author: { id: number; nickname: string }
  pieces: PatternPiece[]
  images: {
    id: number
    url: string
    imageWidthMm: number
    imageHeightMm: number
    orderIndex: number
  }[]
  isFavourite: boolean
}

const {
  confirmOpen,
  successOpen,
  isDeleting,
  error: deleteError,
  request: requestDelete,
  confirm: confirmDelete,
  closeSuccess,
} = useDeleteResource({
  basePath: '/patterns',
  noun: 'pattern',
  redirectTo: '/patterns',
  getId: () => props.id,
})

const props = defineProps<{ id: string }>()
const { t } = useI18n()

const pattern = ref<Pattern | null>(null)
const isFetching = ref(true)
const showSkeleton = ref(false)
const error = ref('')
const isNotFound = ref(false)
const { toggle: toggleFavourite, pending } = useFavouriteToggle('/patterns')

let skeletonTimer: ReturnType<typeof setTimeout> | null = null
const { state: auth } = useAuth()

const clearSkeletonTimer = () => {
  if (skeletonTimer) {
    clearTimeout(skeletonTimer)
    skeletonTimer = null
  }
}

const totalNormal = computed(
  () => pattern.value?.pieces.reduce((sum, p) => sum + p.normalCount, 0) ?? 0,
)
const totalMirrored = computed(
  () => pattern.value?.pieces.reduce((sum, p) => sum + p.mirroredCount, 0) ?? 0,
)

const isOwner = computed(() => !!pattern.value && auth.user?.id === pattern.value.userId)

const metaItems = computed<MetaItem[]>(() =>
  pattern.value
    ? [
        {
          icon: CalendarDays,
          label: t('common.details.added'),
          value: new Date(pattern.value.createdAt).toLocaleDateString(),
        },
        {
          icon: pattern.value.visibility === 'PRIVATE' ? Lock : Globe,
          label: t('common.details.visibility'),
          value: t(pattern.value.visibility === 'PRIVATE' ? 'patterns.private' : 'patterns.public'),
        },
        {
          icon: RulerDimensionLine,
          label: t('common.details.size'),
          value: pattern.value.size,
        },
      ]
    : [],
)

const fetchPattern = async (id: string, activeSignal = { active: true }) => {
  clearSkeletonTimer()
  pattern.value = null
  error.value = ''
  isNotFound.value = false
  isFetching.value = true
  showSkeleton.value = false

  skeletonTimer = setTimeout(() => {
    if (activeSignal.active && isFetching.value) {
      showSkeleton.value = true
    }
  }, 150)

  try {
    const result = await api<Pattern>(`/patterns/${encodeURIComponent(id)}`)
    if (activeSignal.active) pattern.value = result
  } catch (e) {
    if (activeSignal.active) {
      isNotFound.value = e instanceof ApiError && e.status === 404
      error.value =
        e instanceof ApiError ? e.body.message : t('patterns.loadFailed')
    }
  } finally {
    if (activeSignal.active) {
      isFetching.value = false
      showSkeleton.value = false
      clearSkeletonTimer()
    }
  }
}

watch(
  [() => props.id, () => auth.user?.id],
  ([id], _, onCleanup) => {
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    fetchPattern(id, activeSignal)
  },
  { immediate: true },
)
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader :title="pattern?.name ?? (isFetching ? '' : t('patterns.details'))">
        <template #actions>
          <div class="flex items-center gap-2">
            <FavouriteButton
              v-if="pattern && auth.user"
              :is-favourite="pattern.isFavourite"
              :disabled="pending.has(pattern.id)"
              @toggle="toggleFavourite(pattern)"
            />
            <DetailsActions
              v-if="isOwner"
              :edit-to="{ name: 'PatternEdit', params: { id: props.id } }"
              @delete="requestDelete"
            />
          </div>
        </template>
      </PageHeader>
      <!-- TODO - move this to card section?? -->
      <p v-if="pattern" class="-mt-4 text-sm ml-4 text-muted-foreground">
        {{ t('common.details.author') }}: {{ pattern.author.nickname }}
      </p>

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
          <ErrorState
            :title="t(isNotFound ? 'patterns.notFound' : 'patterns.unableToLoad')"
            :message="
              isNotFound ? t('patterns.notFoundMessage') : error
            "
            :code="t(isNotFound ? 'common.errors.notFoundCode' : 'common.errors.errorCode')"
          >
            <template #actions>
              <Button
                v-if="!isNotFound"
                variant="outline"
                class="rounded-lg gap-2"
                @click="fetchPattern(props.id)"
              >
                <RotateCcw class="w-4 h-4" />
                <span>{{ t('common.actions.tryAgain') }}</span>
              </Button>
              <Button as-child variant="default" class="rounded-lg gap-2">
                <RouterLink to="/patterns">
                  <ArrowLeft class="w-4 h-4" />
                  <span>{{ t('common.actions.backToPatterns') }}</span>
                </RouterLink>
              </Button>
            </template>
          </ErrorState>
        </main>

        <main
          v-else-if="pattern"
          key="content"
          class="grid grid-cols-1 md:grid-cols-5 gap-8 items-start"
        >
          <div class="w-full md:col-span-2">
            <PatternPiecesCarousel :images="pattern.images" :pieces="pattern.pieces" />
          </div>

          <div class="md:col-span-3">
            <DetailsCard
              :description="pattern.description"
              :tags="pattern.tags"
              :meta-items="metaItems"
            />
          </div>

          <div class="md:col-span-5 space-y-4">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="text-lg font-bold font-inter text-foreground">
                Pattern pieces ({{ pattern.pieces.length }})
              </h2>
              <p class="text-xs text-muted-foreground">
                Total: {{ totalNormal }} normal, {{ totalMirrored }} mirrored
              </p>
            </div>

            <div
              v-if="pattern.pieces.length"
              class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            >
              <PatternPieceCard
                v-for="(piece, index) in pattern.pieces"
                :key="piece.id"
                :piece="piece"
                :label="`Piece #${index + 1}`"
              />
            </div>
            <p v-else class="text-sm text-muted-foreground">This pattern has no pieces.</p>
          </div>
        </main>
      </Transition>
    </div>

    <DeleteDialogs
      :confirm-open="confirmOpen"
      :success-open="successOpen"
      :is-deleting="isDeleting"
      :error="deleteError"
      :title="t('patterns.deleteTitle', { name: pattern?.name ?? t('patterns.thisPattern') })"
      :description="t('common.confirmations.deleteDescription')"
      :success-title="t('patterns.deleted')"
      :success-description="t('patterns.deletedDescription')"
      @confirm="confirmDelete"
      @cancel="confirmOpen = false"
      @close-success="closeSuccess"
    />
  </GridLayout>
</template>
