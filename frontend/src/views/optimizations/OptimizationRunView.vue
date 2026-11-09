<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import type { OptimizationView } from '@/types/optimization'
import type { FabricResponse } from '@/types/fabric'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DetailsCard, { type MetaItem } from '@/components/common/DetailsCard.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Cpu, Ruler, Scissors, CheckCircle2, XCircle, RotateCcw, ArrowLeft } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import OptimizationVisualizer from '@/components/optimizations/OptimizationVisualizer.vue'

const route = useRoute()
const { t } = useI18n()
const runId = route.params.runId as string

const optimization = ref<OptimizationView | null>(null)
const fabricImageUrl = ref<string>()
const isFetching = ref(true)
const showSkeleton = ref(false)
const error = ref('')
const isNotFound = ref(false)

let skeletonTimer: ReturnType<typeof setTimeout> | null = null

const clearSkeletonTimer = () => {
  if (skeletonTimer) {
    clearTimeout(skeletonTimer)
    skeletonTimer = null
  }
}

onMounted(() => {
  useOptimizationAddingStore().reset()
})

const metaItems = computed<MetaItem[]>(() =>
  optimization.value
    ? [
        {
          icon: Cpu,
          label: t('optimizations.algorithm', 'Algorithm'),
          value: optimization.value.algorithmName,
        },
        {
          icon: Ruler,
          label: t('optimizations.minLength', 'Min Length'),
          value: `${optimization.value.minLengthMm} mm`,
        },
        {
          icon: Scissors,
          label: t('optimizations.allowances', 'Seam / Cutting Allowance'),
          value: `${optimization.value.seamAllowanceMm} mm / ${optimization.value.cuttingAllowanceMm} mm`,
        },
      ]
    : [],
)

const fetchOptimization = async (id: string, activeSignal = { active: true }) => {
  clearSkeletonTimer()
  optimization.value = null
  fabricImageUrl.value = undefined
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
    const result = await api<OptimizationView>(`/optimizations/runs/${encodeURIComponent(id)}`)
    if (activeSignal.active) {
      optimization.value = result

      if (result.fabric.fabricId !== undefined) {
        void api<FabricResponse>(`/fabrics/${encodeURIComponent(result.fabric.fabricId)}`)
          .then((fabric) => {
            if (activeSignal.active) fabricImageUrl.value = fabric.pictureUrl
          })
          .catch((e: unknown) => {
            if (activeSignal.active) {
              console.warn('Unable to load the fabric image for this optimization.', e)
            }
          })
      }
    }
  } catch (e) {
    if (activeSignal.active) {
      isNotFound.value = e instanceof ApiError && e.status === 404
      error.value =
        e instanceof ApiError
          ? e.body.message
          : t('optimizations.loadFailed', 'Failed to load optimization results.')
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
  () => route.params.runId,
  (id, _previousId, onCleanup) => {
    if (!id) return
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
    })
    fetchOptimization(id as string, activeSignal)
  },
  { immediate: true },
)
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader
        :title="
          optimization
            ? t('optimizations.detailsTitle', 'Optimization Results')
            : isFetching
              ? ''
              : t('optimizations.details')
        "
      >
        <template #actions>
          <div v-if="optimization" class="flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full"
              :class="
                optimization.wasSuccessful
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              "
            >
              <component
                :is="optimization.wasSuccessful ? CheckCircle2 : XCircle"
                class="w-4 h-4"
              />
              {{
                optimization.wasSuccessful
                  ? t('optimizations.successful', 'Successful')
                  : t('optimizations.failed', 'Failed')
              }}
            </span>
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
          <ErrorState
            :title="
              t(
                isNotFound ? 'optimizations.notFound' : 'optimizations.unableToLoad',
                'Unable to load optimization',
              )
            "
            :message="
              isNotFound
                ? t(
                    'optimizations.notFoundMessage',
                    'The requested run does not exist or has expired.',
                  )
                : error
            "
            :code="t(isNotFound ? 'common.errors.notFoundCode' : 'common.errors.errorCode')"
          >
            <template #actions>
              <Button
                v-if="!isNotFound"
                variant="outline"
                class="rounded-lg gap-2"
                @click="fetchOptimization(runId)"
              >
                <RotateCcw class="w-4 h-4" />
                <span>{{ t('common.actions.tryAgain', 'Try again') }}</span>
              </Button>
              <Button as-child variant="default" class="rounded-lg gap-2">
                <RouterLink :to="{ name: 'OptimizationNew' }">
                  <ArrowLeft class="w-4 h-4" />
                  <span>{{ t('optimizations.newOptimization', 'New Optimization') }}</span>
                </RouterLink>
              </Button>
            </template>
          </ErrorState>
        </main>

        <main
          v-else-if="optimization"
          key="content"
          class="grid grid-cols-1 md:grid-cols-5 gap-8 items-start"
        >
          <!-- Left side: Visualizer preview container matching carousel width -->
          <div class="w-full md:col-span-2">
            <OptimizationVisualizer
              :placements="optimization.placements"
              :image-url="fabricImageUrl"
              :fabric-width-mm="optimization.fabric.widthMm"
              :fabric-length-mm="optimization.fabric.lengthMm"
              :fabric-boundary="optimization.fabric.boundary"
            />
          </div>

          <!-- Right side: Details card matching pattern meta / description style -->
          <div class="md:col-span-3 space-y-6">
            <DetailsCard
              :description="
                t(
                  'optimizations.detailsDescription',
                  'Review the nesting engine layout metrics, minimum required fabric length, and spatial coordinates below.',
                )
              "
              :meta-items="metaItems"
            />

            <!-- Placements JSON summary preview -->
            <Card class="p-6 space-y-3">
              <h3 class="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Placed Pieces Data ({{ optimization.placements.length }})
              </h3>
              <div
                class="max-h-72 overflow-y-auto border rounded-md p-4 bg-muted/50 font-mono text-xs"
              >
                <pre>{{ JSON.stringify(optimization.placements, null, 2) }}</pre>
              </div>
            </Card>
          </div>
        </main>
      </Transition>
    </div>
  </GridLayout>
</template>
