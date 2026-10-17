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

interface Fabric {
  id: number
  name: string
  description?: string
  pictureUrl?: string
  tags: string[]
  createdAt: string
  area: number
}

const props = defineProps<{ id: string }>()

const fabric = ref<Fabric | null>(null)
const isFetching = ref(true)
const showSkeleton = ref(false)
const error = ref('')

let skeletonTimer: ReturnType<typeof setTimeout> | null = null

const clearSkeletonTimer = () => {
  if (skeletonTimer) {
    clearTimeout(skeletonTimer)
    skeletonTimer = null
  }
}

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
          value: `${fabric.value.area} m²`,
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
        <!-- Place for icons -->
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
          <div class="w-full aspect-square max-h-[500px] md:col-span-2">
            <ImagePreview v-if="fabric.pictureUrl" :src="fabric.pictureUrl" :alt="fabric.name" />
            <div
              v-else
              class="flex h-full items-center justify-center rounded-md bg-muted text-muted-foreground"
            >
              No fabric image available
            </div>
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
  </GridLayout>
</template>

