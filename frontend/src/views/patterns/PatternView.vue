<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DetailsCard from '@/components/common/DetailsCard.vue'
import type { MetaItem } from '@/types/details'
import ErrorState from '@/components/common/ErrorState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDays, RulerDimensionLine, Scissors, Lock, Globe } from 'lucide-vue-next'
import PatternPiecesCarousel from '@/components/patterns/PatternPiecesCarousel.vue'
import DetailsActions from '@/components/common/DetailsActions.vue'
import { useAuth } from '@/stores/authStore'
import { useFavouriteToggle } from '@/composables/resources/useFavouriteToggle'
import FavouriteButton from '@/components/common/FavouriteButton.vue'
import DeleteDialogs from '@/components/common/DeleteDialogs.vue'
import { useDeleteResource } from '@/composables/resources/useDeleteResource'
import { usePatternDetails } from '@/composables/patterns/usePatternDetails'
import PatternPieceCard from '@/components/patterns/PatternPieceCard.vue'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const { state: auth } = useAuth()

const showDimensions = ref(false)

const {
  pattern,
  isFetching,
  showSkeleton,
  error,
  isNotFound,
  minLengthStatus,
  clearSkeletonTimer,
  clearPollTimer,
  fetchPattern,
} = usePatternDetails()

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

const { toggle: toggleFavourite, pending } = useFavouriteToggle('/patterns')

const formatMinLength = (lengthMm: number, widthMm: number | null) => {
  const lengthM = (lengthMm / 1000).toFixed(2)
  const widthM = ((widthMm ?? 1400) / 1000).toFixed(2)
  return t('patterns.minLengthValue', { lengthM, widthM })
}

const imagesById = computed(() => new Map((pattern.value?.images ?? []).map((i) => [i.id, i])))

const isOwner = computed(() => !!pattern.value && auth.user?.id === pattern.value.userId)

const metaItems = computed<MetaItem[]>(() => {
  if (!pattern.value) return []

  const items: MetaItem[] = [
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

  const minLengthMm = pattern.value.minFabricLengthMM
  if (typeof minLengthMm === 'number' || minLengthStatus.value !== null) {
    items.push({
      icon: Scissors,
      label: t('patterns.minLength'),
      value:
        typeof minLengthMm === 'number'
          ? formatMinLength(minLengthMm, pattern.value.minFabricWidthMM)
          : t(
              minLengthStatus.value === 'calculating'
                ? 'patterns.calculating'
                : 'patterns.calculationUnavailable',
            ),
    })
  }

  return items
})

watch(
  [() => props.id, () => auth.user?.id],
  ([id], _, onCleanup) => {
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
      clearPollTimer()
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
            :message="isNotFound ? t('patterns.notFoundMessage') : error"
            :code="t(isNotFound ? 'common.errors.notFoundCode' : 'common.errors.errorCode')"
            :retry-label="isNotFound ? undefined : t('common.actions.tryAgain')"
            :back-label="t('common.actions.backToPatterns')"
            back-to="/patterns"
            @retry="fetchPattern(props.id)"
          />
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

          <section class="md:col-span-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-lg font-bold font-inter text-foreground">
                {{ t('patterns.pieceList.title', { count: pattern.pieces.length }) }}
              </h2>
            </div>

            <div
              v-if="pattern.pieces.length"
              class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            >
              <PatternPieceCard
                v-for="(piece, index) in pattern.pieces"
                :key="piece.id"
                :piece="piece"
                :label="t('patterns.pieceList.pieceNumbered', { number: index + 1 })"
                :image="imagesById.get(piece.patternImageId)"
                :show-dimensions="showDimensions"
              />
            </div>
            <p v-else class="text-sm text-muted-foreground">
              {{ t('patterns.pieceList.empty') }}
            </p>
          </section>
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
