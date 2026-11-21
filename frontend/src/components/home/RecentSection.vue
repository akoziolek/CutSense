<script setup lang="ts" generic="T extends { id: string | number; name: string }">
import { ref, type Component } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight } from 'lucide-vue-next'
import ResourceCard from '@/components/common/ResourceCard.vue'
import ResourceList from '@/components/common/ResourceList.vue'
import { Button } from '@/components/ui/button'
import { usePagedList } from '@/composables/lists/usePagedList'

interface PagedResponse<Item> {
  items: Item[]
  total: number
  totalPages: number
}

const props = withDefaults(
  defineProps<{
    title: string
    endpoint: string
    noun: string
    queryParams?: Record<string, string>
    viewAllTo: RouteLocationRaw
    icon: Component
    emptyTitle: string
    emptyDescription: string
    emptyCtaLabel: string
    emptyCtaTo: RouteLocationRaw
    getItemTo: (item: T) => RouteLocationRaw
    getMeta?: (item: T) => string
    getImageUrl?: (item: T) => string | null | undefined
    limit?: number
  }>(),
  {
    limit: 4,
  },
)

const { t } = useI18n()
const page = ref(1)

const { data, showSkeleton, error, refetch } = usePagedList<PagedResponse<T>>({
  path: props.endpoint,
  noun: props.noun,
  page,
  params: () => ({
    ...props.queryParams,
    page: '1',
    limit: String(props.limit),
    sort: 'date_desc',
  }),
  sources: [page],
})

const resolveImageUrl = (item: T): string | undefined => {
  if (props.getImageUrl) return props.getImageUrl(item) ?? undefined
  if ('imageUrl' in item && typeof item.imageUrl === 'string') return item.imageUrl
  return undefined
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex min-h-7 items-center justify-between mb-6">
      <h2 class="font-bold font-inter text-xl">
        {{ title }}
      </h2>

      <RouterLink
        v-if="data && data.total > 0"
        :to="viewAllTo"
        class="inline-flex items-center gap-1 text-sm font-inter font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{{ t('common.navigation.viewAll') }}</span>
        <ArrowRight class="h-3.5 w-3.5" />
      </RouterLink>
    </div>

    <ResourceList
      :noun="noun"
      :total="data?.total ?? null"
      :loading="showSkeleton || (!data && !error)"
      :error="error"
      :has-criteria="false"
      :page-size="limit"
      @retry="refetch"
    >
      <template #empty>
        <component :is="icon" class="size-10 text-muted-foreground" />
        <h3 class="text-base font-bold font-inter">{{ emptyTitle }}</h3>
        <p class="max-w-xs text-xs text-muted-foreground">
          {{ emptyDescription }}
        </p>
        <Button as-child size="sm" class="mt-2 rounded-lg">
          <RouterLink :to="emptyCtaTo">{{ emptyCtaLabel }}</RouterLink>
        </Button>
      </template>

      <ResourceCard
        v-for="item in data?.items ?? []"
        :key="item.id"
        :to="getItemTo(item)"
        :title="item.name"
        :meta="getMeta ? getMeta(item) : ''"
        :image-url="resolveImageUrl(item)"
        :is-favourite="false"
        :show-favourite="false"
      />
    </ResourceList>
  </section>
</template>
