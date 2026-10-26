<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ListFilter, Plus, RotateCcw, Search, Shirt } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import FloatingButton from '@/components/common/FloatingButton.vue'
import SortMenu from '@/components/common/SortMenu.vue'
import ResourceCard from '@/components/common/ResourceCard.vue'
import ListPagination from '@/components/common/ListPagination.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/api/client'
import type { FabricListItem, FabricListResponse, FabricSort } from '@/types/fabric'
import { formatCardDate } from '@/utils/formatCardDate'

const PAGE_SIZE = 12
const DEFAULT_SORT: FabricSort = 'date_desc'
const SORT_OPTIONS: { value: FabricSort; label: string }[] = [
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'area_asc', label: 'Smallest first' },
  { value: 'area_desc', label: 'Biggest first' },
]

const route = useRoute()
const router = useRouter()

const sort = computed<FabricSort>(() => {
  const value = route.query.sort
  return SORT_OPTIONS.some((o) => o.value === value) ? (value as FabricSort) : DEFAULT_SORT
})
const page = computed(() => {
  const n = Number(route.query.page)
  return Number.isInteger(n) && n >= 1 ? n : 1
})

const sortModel = computed({
  get: () => sort.value,
  set: (value: FabricSort) =>
    router.push({
      query: { ...route.query, sort: value === DEFAULT_SORT ? undefined : value, page: undefined },
    }),
})

const goToPage = (newPage: number) => {
  router.push({ query: { ...route.query, page: newPage === 1 ? undefined : String(newPage) } })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const data = ref<FabricListResponse | null>(null)
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

const fetchFabrics = async (activeSignal = { active: true }) => {
  clearSkeletonTimer()
  error.value = ''
  isFetching.value = true
  showSkeleton.value = false

  skeletonTimer = setTimeout(() => {
    if (activeSignal.active && isFetching.value) showSkeleton.value = true
  }, 150)

  try {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: String(PAGE_SIZE),
      sort: sort.value,
    })
    const result = await api<FabricListResponse>(`/fabrics?${params}`)
    if (!activeSignal.active) return

    if (result.totalPages > 0 && page.value > result.totalPages) {
      await router.replace({
        query: { ...route.query, page: result.totalPages === 1 ? undefined : String(result.totalPages) },
      })
      return
    }
    data.value = result
  } catch (e) {
    if (activeSignal.active) {
      error.value =
        e instanceof ApiError ? e.body.message : 'Could not load fabrics. Please try again.'
    }
  } finally {
    if (activeSignal.active) {
      isFetching.value = false
      showSkeleton.value = false
      clearSkeletonTimer()
    }
  }
}

const pendingFavourites = new Set<number>()

const toggleFavourite = async (fabric: FabricListItem) => {
  if (pendingFavourites.has(fabric.id)) return

  const next = !fabric.isFavourite
  fabric.isFavourite = next
  pendingFavourites.add(fabric.id)

  try {
    await api(`/fabrics/${fabric.id}/favourite`, {
      method: 'PATCH',
      body: JSON.stringify({ isFavourite: next }),
    })
  } catch (e) {
    fabric.isFavourite = !next 
    toast.error(next ? 'Could not add to favourites' : 'Could not remove from favourites', {
      description: e instanceof ApiError ? e.body.message : 'Please try again.',
    })
  } finally {
    pendingFavourites.delete(fabric.id)
  }
}

watch(
  [page, sort],
  (_, __, onCleanup) => {
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    fetchFabrics(activeSignal)
  },
  { immediate: true },
)
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader>
        <span>Fabrics</span>
        <span v-if="data" class="ml-3 text-sm font-semibold">({{ data.total }} found)</span>
      </PageHeader>

      <!--TODO replace Search and Filter - placeholders for now -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative flex-1 min-w-48">
          <Search
            class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input disabled placeholder="Search fabrics..." class="h-9 pl-9" />
        </div>
        <Button variant="outline" size="sm" class="gap-2" disabled>
          <ListFilter class="size-4" />
          Filter
        </Button>
        <SortMenu v-model="sortModel" :options="SORT_OPTIONS" />
      </div>

      <Transition
        mode="out-in"
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <!-- loading -->
        <div
          v-if="showSkeleton"
          key="skeleton"
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          <div v-for="n in PAGE_SIZE" :key="n" class="space-y-3">
            <Skeleton class="aspect-square w-full rounded-md" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        </div>

        <!-- error -->
        <div v-else-if="error" key="error">
          <ErrorState title="Unable to load fabrics" :message="error" code="Error">
            <template #actions>
              <Button variant="outline" class="rounded-lg gap-2" @click="fetchFabrics()">
                <RotateCcw class="w-4 h-4" />
                <span>Try again</span>
              </Button>
              <Button as-child variant="default" class="rounded-lg gap-2">
                <RouterLink to="/">
                  <ArrowLeft class="w-4 h-4" />
                  <span>Back to home</span>
                </RouterLink>
              </Button>
            </template>
          </ErrorState>
        </div>

        <!-- empty: user has no fabrics yet -->
        <div
          v-else-if="data && data.total === 0"
          key="empty"
          class="flex flex-col items-center justify-center gap-2 py-20 text-center"
        >
          <Shirt class="size-8 text-muted-foreground" />
          <h2 class="text-sm font-bold font-inter">No fabrics yet</h2>
          <p class="max-w-xs text-xs text-muted-foreground">
            Upload an image to start configuring your materials and optimizing fabric usage.
          </p>
          <Button as-child size="sm" class="mt-2 rounded-lg">
            <RouterLink :to="{ name: 'AddFabric' }">Add your first fabric</RouterLink>
          </Button>
        </div>

        <!-- list -->
        <div v-else-if="data" key="list" class="space-y-10">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <ResourceCard
              v-for="fabric in data.items"
              :key="fabric.id"
              :to="{ name: 'FabricDetails', params: { id: fabric.id } }"
              :title="fabric.name"
              :meta="`${formatCardDate(fabric.createdAt)} • ${fabric.area.toFixed(1)} m²`"
              :image-url="fabric.pictureUrl"
              :is-favourite="fabric.isFavourite"
              toggleable
              @toggle-favourite="toggleFavourite(fabric)"
            />
          </div>

          <ListPagination
            v-if="data.totalPages > 1"
            :page="page"
            :total="data.total"
            :items-per-page="PAGE_SIZE"
            @update:page="goToPage"
          />
        </div>
      </Transition>
    </div>

    <FloatingButton :to="{ name: 'AddFabric' }" />
  </GridLayout>
</template>