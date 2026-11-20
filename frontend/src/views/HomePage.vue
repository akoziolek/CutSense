<script setup lang="ts">
import { type Component, computed, onMounted, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Puzzle, Shirt, Layers, Sparkles } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
import QuickAction from '@/components/home/QuickAction.vue'
import RecentSection from '@/components/home/RecentSection.vue'
import StatCard from '@/components/common/StatCard.vue'
import { useAuth } from '@/stores/authStore'
import { api } from '@/api/client'
import { formatCardDate } from '@/utils/formatCardDate'
import type { OptimizationListItem } from '@/types/optimization'
import type { PatternListItem } from '@/types/pattern'
import type { FabricListItem } from '@/types/fabric'

interface QuickActionItem {
  label: string
  subtext: string
  icon: Component
  to: RouteLocationRaw
}

interface StatCardItem {
  label: string
  value: number
  delta: number
  deltaLabel: string
  emptyText: string
  icon: Component
  loading: boolean
}

interface ResourceStat {
  total: number
  thisWeek: number
}

interface UserStatistics {
  optimizations: ResourceStat
  fabrics: ResourceStat
  patterns: ResourceStat
}

const { t } = useI18n()
const { state: auth } = useAuth()

const statistics = ref<UserStatistics | null>(null)
const isLoadingStats = ref(true)
const statsLoadFailed = ref(false)

onMounted(async () => {
  try {
    statistics.value = await api<UserStatistics>('/statistics')
  } catch (err) {
    console.error('Failed to load dashboard statistics:', err)
    statsLoadFailed.value = true
  } finally {
    isLoadingStats.value = false
  }
})

const quickActions = computed<QuickActionItem[]>(() => [
  {
    label: t('home.actions.newOptimization'),
    subtext: t('home.actions.newOptimizationDescription'),
    icon: Puzzle,
    to: '/optimizations/new',
  },
  {
    label: t('home.actions.newPattern'),
    subtext: t('home.actions.newPatternDescription'),
    icon: Shirt,
    to: '/patterns/new',
  },
  {
    label: t('home.actions.newFabric'),
    subtext: t('home.actions.newFabricDescription'),
    icon: Layers,
    to: '/fabrics/new',
  },
])

const statCards = computed<StatCardItem[]>(() => {
  const opt = statistics.value?.optimizations
  const fab = statistics.value?.fabrics
  const pat = statistics.value?.patterns

  return [
    {
      label: t('home.stats.optimizations'),
      value: opt?.total ?? 0,
      delta: opt?.thisWeek ?? 0,
      deltaLabel:
        (opt?.thisWeek ?? 0) > 0 ? t('home.stats.addedThisWeek') : t('home.stats.noneThisWeek'),
      emptyText: t('home.stats.emptyOptimizations'),
      icon: Sparkles,
      loading: isLoadingStats.value,
    },
    {
      label: t('home.stats.patterns'),
      value: pat?.total ?? 0,
      delta: pat?.thisWeek ?? 0,
      deltaLabel:
        (pat?.thisWeek ?? 0) > 0 ? t('home.stats.addedThisWeek') : t('home.stats.noneThisWeek'),
      emptyText: t('home.stats.emptyPatterns'),
      icon: Shirt,
      loading: isLoadingStats.value,
    },
    {
      label: t('home.stats.fabrics'),
      value: fab?.total ?? 0,
      delta: fab?.thisWeek ?? 0,
      deltaLabel:
        (fab?.thisWeek ?? 0) > 0 ? t('home.stats.addedThisWeek') : t('home.stats.noneThisWeek'),
      emptyText: t('home.stats.emptyFabrics'),
      icon: Layers,
      loading: isLoadingStats.value,
    },
  ]
})
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-8">
      <PageHeader>
        {{ t('home.hello') }} <span class="italic">{{ auth.user?.nickname }}</span> !
      </PageHeader>

      <div class="mx-4 space-y-14">
        <section class="space-y-4">
          <h2 class="font-bold font-inter text-xl">{{ t('home.actions.quickActions') }}</h2>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <QuickAction v-for="action in quickActions" :key="action.label" v-bind="action" />
          </div>
        </section>

        <RecentSection
          :title="t('home.lastOptimizations')"
          endpoint="/optimizations"
          noun="optimizations"
          view-all-to="/optimizations"
          :icon="Sparkles"
          empty-title="No saved optimizations yet"
          empty-description="Run an optimization and save the result to find it here."
          :empty-cta-label="t('home.actions.newOptimization')"
          empty-cta-to="/optimizations/new"
          :get-item-to="
            (item: OptimizationListItem) => ({
              name: 'OptimizationDetails',
              params: { id: item.id },
            })
          "
          :get-meta="
            (item: OptimizationListItem) =>
              [formatCardDate(item.createdAt), item.patternName].filter(Boolean).join(' · ')
          "
        />

        <section class="space-y-4">
          <h2 class="font-bold font-inter text-xl">{{ t('home.statistics') }}</h2>
          <p v-if="statsLoadFailed" class="text-sm text-destructive" role="alert">
            {{ t('home.stats.loadFailed') }}
          </p>
          <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard v-for="stat in statCards" :key="stat.label" v-bind="stat" />
          </div>
        </section>

        <RecentSection
          :title="t('home.newPatterns')"
          endpoint="/patterns"
          noun="patterns"
          :query-params="{ community: 'false' }"
          view-all-to="/patterns"
          :icon="Shirt"
          empty-title="No patterns saved yet"
          empty-description="Upload or scan a sewing pattern to reuse it across fabrics."
          :empty-cta-label="t('home.actions.newPattern')"
          empty-cta-to="/patterns/new"
          :get-item-to="
            (item: PatternListItem) => ({ name: 'PatternDetails', params: { id: item.id } })
          "
          :get-meta="
            (item: PatternListItem) =>
              [formatCardDate(item.createdAt), item?.size].filter(Boolean).join(' • ')
          "
        />

        <RecentSection
          :title="t('home.newFabrics')"
          endpoint="/fabrics"
          noun="fabrics"
          view-all-to="/fabrics"
          :icon="Layers"
          empty-title="No fabrics added yet"
          empty-description="Add your first fabric to start running layout optimizations."
          :empty-cta-label="t('home.actions.newFabric')"
          empty-cta-to="/fabrics/new"
          :get-item-to="
            (item: FabricListItem) => ({ name: 'FabricDetails', params: { id: item.id } })
          "
          :get-image-url="(item: FabricListItem) => item.pictureUrl"
          :get-meta="
            (item: FabricListItem) =>
              `${formatCardDate(item.createdAt)} • ${(item.areaMm2 / 1_000_000).toFixed(1)} m²`
          "
        />
      </div>
    </div>
  </GridLayout>
</template>
