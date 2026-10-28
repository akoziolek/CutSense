<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
}

const props = defineProps<{ id: string }>()

const pattern = ref<Pattern | null>(null)
const isFetching = ref(true)
const showSkeleton = ref(false)
const error = ref('')
const isForbidden = ref(false)

let skeletonTimer: ReturnType<typeof setTimeout> | null = null
const { state: auth } = useAuth()

const clearSkeletonTimer = () => {
  if (skeletonTimer) {
    clearTimeout(skeletonTimer)
    skeletonTimer = null
  }
}

const metaItems = computed<MetaItem[]>(() =>
  pattern.value
    ? [
        {
          icon: CalendarDays,
          label: 'Added',
          value: new Date(pattern.value.createdAt).toLocaleDateString(),
        },
        {
          icon: pattern.value.visibility === 'PRIVATE' ? Lock : Globe,
          label: 'Visibility',
          value: pattern.value.visibility === 'PRIVATE' ? 'Private' : 'Public',
        },
        {
          icon: RulerDimensionLine,
          label: 'Size',
          value: pattern.value.size,
        },
      ]
    : [],
)

const fetchPattern = async (id: string, activeSignal = { active: true }) => {
  clearSkeletonTimer()
  pattern.value = null
  error.value = ''
  isForbidden.value = false
  isFetching.value = true
  showSkeleton.value = false

  skeletonTimer = setTimeout(() => {
    if (activeSignal.active && isFetching.value) {
      showSkeleton.value = true
    }
  }, 150)

  try {
    const result = await api<Pattern>(`/patterns/${encodeURIComponent(id)}`)
    console.log(pattern)
    if (activeSignal.active) pattern.value = result
  } catch (e) {
    if (activeSignal.active) {
      if (e instanceof ApiError) {
        isForbidden.value = e.status === 403
        error.value = e.body.message
      } else {
        error.value = 'Could not load pattern. Please try again.'
      }
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
  () => props.id,
  (id, _, onCleanup) => {
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
      <PageHeader :title="pattern?.name ?? (isFetching ? '' : 'Pattern details')">
        <template #actions>
          <div class="flex items-center gap-2">
            <DetailsActions
              v-if="pattern && auth.user?.id === pattern.userId"
              :edit-to="{ name: 'PatternEdit', params: { id: props.id } }"
            />
          </div>
        </template>
      </PageHeader>
      <!-- TODO - move this to card section?? -->
      <p v-if="pattern" class="-mt-4 text-sm ml-4 text-muted-foreground">
        Author: {{ pattern.author.nickname }}
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
            :title="isForbidden ? 'This pattern is private' : 'Unable to load pattern'"
            :message="error"
            :code="isForbidden ? 'Access denied' : 'Error'"
          >
            <template #actions>
              <Button
                v-if="!isForbidden"
                variant="outline"
                class="rounded-lg gap-2"
                @click="fetchPattern(props.id)"
              >
                <RotateCcw class="w-4 h-4" />
                <span>Try again</span>
              </Button>
              <Button as-child variant="default" class="rounded-lg gap-2">
                <RouterLink to="/patterns">
                  <ArrowLeft class="w-4 h-4" />
                  <span>Back to patterns</span>
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
            <PatternPiecesCarousel :pieces="pattern.pieces" />
          </div>

          <div class="md:col-span-3">
            <DetailsCard
              :description="pattern.description"
              :tags="pattern.tags"
              :meta-items="metaItems"
            />
          </div>
        </main>
      </Transition>
    </div>
  </GridLayout>
</template>
