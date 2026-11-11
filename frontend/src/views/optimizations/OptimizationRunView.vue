<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { api, ApiError } from '@/api/client'
import type { OptimizationView } from '@/types/optimization'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DetailsCard, { type MetaItem } from '@/components/common/DetailsCard.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SaveOptimizationModal from '@/components/optimizations/SaveOptimizationModal.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Cpu,
  Ruler,
  Scissors,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  Save,
  Check,
  LogIn,
} from 'lucide-vue-next'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { login, useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { state: auth } = useAuth()

// the same view serves an unsaved run (/optimizations/run/:runId) and a saved result (/optimizations/:id)
const isSavedRoute = computed(() => route.params.id !== undefined)
const resourceId = computed(() => String(route.params.id ?? route.params.runId ?? ''))

const optimization = ref<OptimizationView | null>(null)
const isFetching = ref(true)
const showSkeleton = ref(false)
const error = ref('')
const isNotFound = ref(false)

const isSaveOpen = ref(false)
const isSaving = ref(false)
const saveError = ref('')

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

const fetchOptimization = async (activeSignal = { active: true }) => {
  const path = isSavedRoute.value
    ? `/optimizations/${encodeURIComponent(resourceId.value)}`
    : `/optimizations/runs/${encodeURIComponent(resourceId.value)}`

  clearSkeletonTimer()
  optimization.value = null
  error.value = ''
  isNotFound.value = false
  isFetching.value = true
  showSkeleton.value = false

  skeletonTimer = setTimeout(() => {
    if (activeSignal.active && isFetching.value) showSkeleton.value = true
  }, 150)

  try {
    const result = await api<OptimizationView>(path)
    if (activeSignal.active) optimization.value = result
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

const openSave = () => {
  saveError.value = ''
  isSaveOpen.value = true
}

const handleSave = async (name: string) => {
  const runId = optimization.value?.runId
  if (!runId || isSaving.value) return

  isSaving.value = true
  saveError.value = ''
  try {
    const { id } = await api<{ id: number }>(`/optimizations/runs/${runId}/save`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    isSaveOpen.value = false
    toast.success(t('optimizations.savedToast', 'Optimization saved'))
    await router.replace({ name: 'OptimizationDetails', params: { id } })
  } catch (e) {
    if (e instanceof ApiError) {
      saveError.value =
        e.body.errorCode === 'VALIDATION_ERROR' && Array.isArray(e.body.details)
          ? e.body.details.join(' ')
          : e.body.message
    } else {
      saveError.value = t('optimizations.saveFailed', 'Could not save the optimization. Please try again.')
    }
  } finally {
    isSaving.value = false
  }
}

watch(
  [isSavedRoute, resourceId],
  ([, id], _, onCleanup) => {
    if (!id) return
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    fetchOptimization(activeSignal)
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
            ? (optimization.name ?? t('optimizations.detailsTitle', 'Optimization Results'))
            : isFetching
              ? ''
              : t('optimizations.details', 'Optimization')
        "
      >
        <template #actions>
          <div v-if="optimization" class="flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full"
              :class="optimization.wasSuccessful ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'"
            >
              <component :is="optimization.wasSuccessful ? CheckCircle2 : XCircle" class="w-4 h-4" />
              {{ optimization.wasSuccessful ? t('optimizations.successful', 'Successful') : t('optimizations.failed', 'Failed') }}
            </span>

            <template v-if="optimization.wasSuccessful">
              <Badge
                v-if="optimization.isSaved"
                variant="secondary"
                class="gap-1.5 rounded-md bg-brand-grey px-3 py-1 text-sm font-normal text-foreground"
              >
                <Check class="w-4 h-4" />
                {{ t('optimizations.saved', 'Saved') }}
              </Badge>
              <Button v-else-if="auth.user" size="sm" class="gap-2 rounded-lg" @click="openSave">
                <Save class="w-4 h-4" />
                {{ t('optimizations.save', 'Save') }}
              </Button>
              <Button
                v-else
                variant="outline"
                size="sm"
                class="gap-2 rounded-lg"
                @click="login(route.fullPath)"
              >
                <LogIn class="w-4 h-4" />
                {{ t('optimizations.signInToSave', 'Sign in to save') }}
              </Button>
            </template>
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
            :title="t(isNotFound ? 'optimizations.notFound' : 'optimizations.unableToLoad', 'Unable to load optimization')"
            :message="isNotFound ? t('optimizations.notFoundMessage', 'The requested optimization does not exist or has expired.') : error"
            :code="t(isNotFound ? 'common.errors.notFoundCode' : 'common.errors.errorCode')"
          >
            <template #actions>
              <Button
                v-if="!isNotFound"
                variant="outline"
                class="rounded-lg gap-2"
                @click="fetchOptimization()"
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
          <div class="w-full md:col-span-2">
            <Card class="p-6 aspect-square flex flex-col items-center justify-center bg-muted/30 border-dashed">
              <p class="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Canvas Preview</p>
              <p class="text-sm font-semibold text-center">{{ optimization.placements.length }} Pieces Placed</p>
            </Card>
          </div>

          <div class="md:col-span-3 space-y-6">
            <DetailsCard
              :description="t('optimizations.detailsDescription', 'Review the nesting engine layout metrics, minimum required fabric length, and spatial coordinates below.')"
              :meta-items="metaItems"
            />

            <Card class="p-6 space-y-3">
              <h3 class="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Placed Pieces Data ({{ optimization.placements.length }})
              </h3>
              <div class="max-h-72 overflow-y-auto border rounded-md p-4 bg-muted/50 font-mono text-xs">
                <pre>{{ JSON.stringify(optimization.placements, null, 2) }}</pre>
              </div>
            </Card>
          </div>
        </main>
      </Transition>
    </div>

    <SaveOptimizationModal
      v-model:open="isSaveOpen"
      :loading="isSaving"
      :error="saveError"
      @save="handleSave"
    />
  </GridLayout>
</template>