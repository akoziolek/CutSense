<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { api, ApiError, apiBlob } from '@/api/client'
import type { OptimizationView } from '@/types/optimization'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DetailsCard, { type MetaItem } from '@/components/common/DetailsCard.vue'
import DetailsActions from '@/components/common/DetailsActions.vue'
import DeleteDialogs from '@/components/common/DeleteDialogs.vue'
import StatCard from '@/components/optimizations/StatCard.vue'
import OptimizationPreview, {
  type PlacedPieceViewItem,
} from '@/components/optimizations/OptimizationPreview.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SaveOptimizationModal from '@/components/optimizations/SaveOptimizationModal.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Scissors,
  Layers,
  RulerDimensionLine,
  RotateCw,
  RotateCcw,
  ArrowLeft,
  Save,
  LogIn,
  Timer,
  Shapes,
  Download,
  FileText,
  Maximize2,
  Loader2,
} from 'lucide-vue-next'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { login, useAuth } from '@/composables/useAuth'
import { useDeleteResource } from '@/composables/useDeleteResource'
import { getGeometryBoundsMm } from '@/utils/geometry'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
const isDownloadingPdf = ref(false)

const isCanvasExpanded = ref(false)
const isSaveOpen = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const isEditOpen = ref(false)
const isRenaming = ref(false)
const renameError = ref('')

const {
  confirmOpen,
  successOpen,
  isDeleting,
  error: deleteError,
  request: requestDelete,
  confirm: confirmDelete,
  closeSuccess,
} = useDeleteResource({
  basePath: '/optimizations',
  noun: 'optimization',
  redirectTo: '/optimizations',
  getId: () => String(optimization.value?.id ?? ''),
})

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

const formatAreaM2 = (areaMm2: number) => `${(areaMm2 / 1_000_000).toFixed(2).replace('.', ',')} m²`

const normalizedLayout = computed(() => {
  const opt = optimization.value
  if (!opt) {
    return {
      fabricBoundary: [] as [number, number][],
      pieces: [] as PlacedPieceViewItem[],
      coordinateOriginMm: { minX: 0, minY: 0 },
      widthMm: 0,
      heightMm: 0,
    }
  }

  const boundary = opt.fabric.boundary ?? []
  const fabricBoundary: [number, number][] =
    boundary.length >= 3
      ? boundary
      : [
          [0, 0],
          [opt.fabric.widthMm, 0],
          [opt.fabric.widthMm, opt.fabric.lengthMm],
          [0, opt.fabric.lengthMm],
        ]

  const pieceTypeNumberById = new Map<number, number>()
  for (const placement of opt.placements ?? []) {
    if (!pieceTypeNumberById.has(placement.patternPieceId)) {
      pieceTypeNumberById.set(placement.patternPieceId, pieceTypeNumberById.size + 1)
    }
  }

  const pieces: PlacedPieceViewItem[] = (opt.placements ?? []).flatMap((placement, index) => {
    if (!placement.polygon || placement.polygon.length < 3) return []
    const totalRotation =
      ((((placement.rotationAngle ?? 0) + (placement.isFlipped180 ? 180 : 0)) % 360) + 360) % 360

    return [
      {
        id: index + 1,
        patternPieceId: placement.patternPieceId,
        pieceNumber: pieceTypeNumberById.get(placement.patternPieceId) ?? index + 1,
        isMirrored: placement.isMirrored,
        rotationAngle: totalRotation,
        points: placement.polygon,
      },
    ]
  })

  const bounds = getGeometryBoundsMm([fabricBoundary, ...pieces.map((piece) => piece.points)])

  return {
    fabricBoundary,
    pieces,
    coordinateOriginMm: bounds.originMm,
    widthMm: bounds.widthMm,
    heightMm: bounds.heightMm,
  }
})

const metaItems = computed<MetaItem[]>(() =>
  optimization.value
    ? [
        {
          icon: Sparkles,
          label: t('optimizations.algorithm'),
          value: optimization.value.algorithmName,
        },
        {
          icon: Scissors,
          label: t('optimizations.allowances'),
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
      error.value = e instanceof ApiError ? e.body.message : t('optimizations.loadFailed')
    }
  } finally {
    if (activeSignal.active) {
      isFetching.value = false
      showSkeleton.value = false
      clearSkeletonTimer()
    }
  }
}

const handleDownloadPdf = async (format: 'a4' | 'actual') => {
  const opt = optimization.value
  if (!opt || isDownloadingPdf.value) return

  const basePath =
    opt.isSaved && opt.id !== undefined
      ? `/optimizations/${opt.id}/pdf`
      : opt.runId
        ? `/optimizations/runs/${encodeURIComponent(opt.runId)}/pdf`
        : null

  if (!basePath) return

  isDownloadingPdf.value = true
  try {
    const blob = await apiBlob(`${basePath}?format=${format}`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const baseName = (opt.name ?? opt.pattern?.name ?? 'optimization')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
    link.href = url
    link.download = `${baseName}-${format === 'actual' ? '1-to-1' : 'a4'}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast.error(e instanceof ApiError ? e.body.message : t('optimizations.downloadPdfFailed'))
  } finally {
    isDownloadingPdf.value = false
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
    toast.success(t('optimizations.savedToast'))
    await router.replace({ name: 'OptimizationDetails', params: { id } })
  } catch (e) {
    if (e instanceof ApiError) {
      saveError.value =
        e.body.errorCode === 'VALIDATION_ERROR' && Array.isArray(e.body.details)
          ? e.body.details.join(' ')
          : e.body.message
    } else {
      saveError.value = t('optimizations.saveFailed')
    }
  } finally {
    isSaving.value = false
  }
}

const openEdit = () => {
  renameError.value = ''
  isEditOpen.value = true
}

const handleRename = async (name: string) => {
  if (!optimization.value?.id || isRenaming.value) return
  isRenaming.value = true
  renameError.value = ''
  try {
    const updated = await api<{ id: number; name: string }>(
      `/optimizations/${optimization.value.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      },
    )
    optimization.value.name = updated.name
    isEditOpen.value = false
    toast.success(t('optimizations.updatedToast'))
  } catch (e) {
    renameError.value =
      e instanceof ApiError ? e.body.message : t('optimizations.updateFailed')
  } finally {
    isRenaming.value = false
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
    <div class="mx-auto w-full max-w-screen-2xl space-y-8 px-4 py-6 sm:px-12 sm:py-10 lg:px-14">
      <PageHeader
        :title="
          optimization
            ? (optimization.name ?? t('optimizations.resultsTitle'))
            : isFetching
              ? ''
              : t('optimizations.details')
        "
        :show-back="false"
      >
        <template #actions>
          <div
            v-if="optimization && optimization.wasSuccessful"
            class="flex flex-wrap items-center justify-end gap-2.5 font-inter"
          >
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  class="h-9 px-4 gap-2 rounded-lg border border-foreground text-foreground bg-background hover:bg-muted/20 cursor-pointer font-medium shadow-2xs"
                  :disabled="isDownloadingPdf"
                >
                  <Loader2 v-if="isDownloadingPdf" class="h-4 w-4 animate-spin" />
                  <Download v-else class="h-4.5 w-4.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                class="w-64 sm:w-72 max-w-[calc(100vw-2rem)] border border-foreground/30 p-1.5 shadow-md"
              >
                <DropdownMenuItem
                  class="items-start gap-2.5 rounded-md p-2.5 cursor-pointer"
                  @select="handleDownloadPdf('a4')"
                >
                  <FileText class="h-4 w-4 shrink-0 mt-0.5" />
                  <div class="flex flex-col gap-0.5">
                    <span class="font-medium leading-tight">
                      {{ t('optimizations.downloadPdfA4') }}
                    </span>
                    <span class="text-xs text-muted-foreground leading-snug">
                      {{ t('optimizations.downloadPdfA4Description') }}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="items-start gap-2.5 rounded-md p-2.5 cursor-pointer"
                  @select="handleDownloadPdf('actual')"
                >
                  <Maximize2 class="h-4 w-4 shrink-0 mt-0.5" />
                  <div class="flex flex-col gap-0.5">
                    <span class="font-medium leading-tight">
                      {{ t('optimizations.downloadPdfActual') }}
                    </span>
                    <span class="text-xs text-muted-foreground leading-snug">
                      {{ t('optimizations.downloadPdfActualDescription') }}
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <template v-if="!optimization.isSaved">
              <Button
                v-if="auth.user"
                class="h-9 px-4 gap-2 rounded-lg border border-foreground text-foreground bg-brand-pink/50 hover:bg-brand-pink/80 cursor-pointer font-medium shadow-2xs"
                @click="openSave"
              >
                <Save class="h-4.5 w-4.5" />
                <span>{{ t('optimizations.save') }}</span>
              </Button>
              <Button
                v-else
                variant="outline"
                class="h-9 px-4 gap-2 rounded-lg border border-foreground text-foreground bg-background hover:bg-muted/20 cursor-pointer font-medium shadow-2xs"
                @click="login(route.fullPath)"
              >
                <LogIn class="h-4.5 w-4.5" />
                <span>{{ t('optimizations.signInToSave') }}</span>
              </Button>
            </template>

            <DetailsActions
              v-if="optimization.isSaved"
              :edit-label="t('actions.edit')"
              @edit="openEdit"
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
          class="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start"
        >
          <div class="w-full space-y-3">
            <Skeleton class="h-7 w-44" />
            <Skeleton class="w-full h-[460px] rounded-md" />
          </div>
          <div class="space-y-7">
            <div class="space-y-3">
              <Skeleton class="h-7 w-48" />
              <Skeleton class="h-44 w-full rounded-md" />
            </div>
            <div class="space-y-3">
              <Skeleton class="h-7 w-32" />
              <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Skeleton class="h-24 w-full rounded-md" />
                <Skeleton class="h-24 w-full rounded-md" />
                <Skeleton class="h-24 w-full rounded-md" />
                <Skeleton class="h-24 w-full rounded-md" />
              </div>
            </div>
          </div>
        </main>

        <main v-else-if="error" key="error">
          <ErrorState
            :title="t(isNotFound ? 'optimizations.notFound' : 'optimizations.unableToLoad')"
            :message="isNotFound ? t('optimizations.notFoundMessage') : error"
            :code="t(isNotFound ? 'common.errors.notFoundCode' : 'common.errors.errorCode')"
          >
            <template #actions>
              <Button
                v-if="!isNotFound"
                variant="outline"
                class="gap-2 rounded-lg border-brand-green/40 text-foreground hover:bg-brand-green hover:text-brand-green-foreground"
                @click="fetchOptimization()"
              >
                <RotateCcw class="w-4 h-4" />
                <span>{{ t('common.actions.tryAgain') }}</span>
              </Button>
              <Button
                as-child
                variant="default"
                class="gap-2 rounded-lg bg-brand-green text-brand-green-foreground hover:bg-brand-green/80"
              >
                <RouterLink :to="{ name: 'OptimizationNew' }">
                  <ArrowLeft class="w-4 h-4" />
                  <span>{{ t('optimizations.newOptimization') }}</span>
                </RouterLink>
              </Button>
            </template>
          </ErrorState>
        </main>

        <main v-else-if="optimization" key="content">
          <ErrorState
            v-if="!optimization.wasSuccessful"
            :title="t('optimizations.unsuccessful')"
            :message="t('optimizations.failedDescription')"
            :code="t('common.errors.errorCode')"
          >
            <template #actions>
              <Button as-child variant="default" class="rounded-lg gap-2">
                <RouterLink :to="{ name: 'OptimizationNew' }">
                  <ArrowLeft class="w-4 h-4" />
                  <span>{{ t('optimizations.newOptimization') }}</span>
                </RouterLink>
              </Button>
            </template>
          </ErrorState>

          <div v-else class="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
            <div
              :class="isCanvasExpanded ? 'lg:col-span-2' : 'lg:col-span-1'"
              class="w-full space-y-3"
            >
              <h2 class="text-xl font-bold font-inter tracking-tight text-foreground">
                {{ t('optimizations.placementOfPieces') }}
              </h2>
              <OptimizationPreview
                v-model:is-expanded="isCanvasExpanded"
                :fabric-shape="normalizedLayout.fabricBoundary"
                :pieces="normalizedLayout.pieces"
                :coordinate-origin-mm="normalizedLayout.coordinateOriginMm"
                :canvas-width-mm="normalizedLayout.widthMm"
                :canvas-height-mm="normalizedLayout.heightMm"
                :seam-allowance-mm="optimization.seamAllowanceMm"
                :cutting-allowance-mm="optimization.cuttingAllowanceMm"
                :photo-url="null"
              />
            </div>

            <div
              :class="[
                isCanvasExpanded
                  ? 'lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2'
                  : 'lg:col-span-1 space-y-7',
              ]"
            >
              <section class="space-y-3">
                <h2 class="text-xl font-bold font-inter tracking-tight text-foreground">
                  {{ t('optimizations.detailsTitle') }}
                </h2>

                <DetailsCard :meta-items="metaItems">
                  <div class="space-y-3 text-sm">
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Layers class="h-4 w-4 text-foreground shrink-0" />
                      <RouterLink
                        v-if="optimization.fabric.fabricId"
                        :to="`/fabrics/${optimization.fabric.fabricId}`"
                        class="font-bold font-inter text-foreground hover:underline decoration-1 underline-offset-2 transition-colors hover:text-primary"
                      >
                        {{
                          optimization.fabric.name ??
                          `${t('optimizations.libraryFabric')} #${optimization.fabric.fabricId}`
                        }}
                      </RouterLink>
                      <span v-else class="font-bold text-foreground font-inter">
                        {{ t('optimizations.customFabric') }}
                      </span>
                      <span class="text-muted-foreground text-xs">
                        {{ optimization.fabric.widthMm }} × {{ optimization.fabric.lengthMm }} mm
                      </span>
                    </div>

                    <div
                      v-if="optimization.pattern"
                      class="flex flex-wrap items-center gap-x-3 gap-y-1"
                    >
                      <Shapes class="h-4 w-4 text-foreground shrink-0" />
                      <RouterLink
                        :to="`/patterns/${optimization.pattern.id}`"
                        class="font-bold font-inter text-foreground hover:underline decoration-1 underline-offset-2 transition-colors hover:text-primary"
                      >
                        {{ optimization.pattern.name }}
                      </RouterLink>

                      <span v-if="optimization.pattern.size" class="text-xs text-muted-foreground">
                        {{ t('common.details.size') }}: {{ optimization.pattern.size }}
                      </span>
                    </div>
                  </div>
                </DetailsCard>
              </section>

              <section class="space-y-3">
                <h2 class="text-xl font-bold font-inter tracking-tight text-foreground">
                  {{ t('optimizations.statistics') }}
                </h2>

                <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <StatCard
                    :label="t('optimizations.remainingFabric')"
                    :value="formatAreaM2(optimization.stats.remainingFabricArea)"
                    :subtext="`${optimization.stats.remainingFabricPercentage}% ${t('optimizations.ofTotalFabric')}`"
                    :icon="RulerDimensionLine"
                  />

                  <StatCard
                    :label="t('optimizations.waste')"
                    :value="formatAreaM2(optimization.stats.wasteArea)"
                    :icon="Scissors"
                  >
                    <template #subtext>
                      <span class="font-semibold text-destructive">
                        {{ optimization.stats.wastePercentage }}%
                      </span>
                      {{ t('optimizations.ofTotalFabric') }}
                    </template>
                  </StatCard>

                  <StatCard
                    :label="t('optimizations.usableScraps')"
                    :value="formatAreaM2(optimization.stats.usableScrapsArea)"
                    :icon="RotateCw"
                  >
                    <template #subtext>
                      <span class="font-semibold text-brand-green-foreground">
                        {{ optimization.stats.usableScrapsPercentage }}%
                      </span>
                      {{ t('optimizations.ofTotalFabric') }}
                    </template>
                  </StatCard>

                  <StatCard
                    :label="t('optimizations.executionTime')"
                    :value="`${optimization.executionTime} ms`"
                    :icon="Timer"
                  />
                </div>
              </section>
            </div>
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
    <SaveOptimizationModal
      v-model:open="isEditOpen"
      :initial-name="optimization?.name"
      :loading="isRenaming"
      :error="renameError"
      :title="t('optimizations.editTitle')"
      :description="t('optimizations.editDescription')"
      :confirm-label="t('common.actions.save')"
      @save="handleRename"
    />
    <DeleteDialogs
      :confirm-open="confirmOpen"
      :success-open="successOpen"
      :is-deleting="isDeleting"
      :error="deleteError"
      :title="t('optimizations.list.deleteTitle', { name: optimization?.name ?? t('optimizations.list.thisOptimization') })"
      :description="t('optimizations.list.deleteDescription')"
      :success-title="t('optimizations.list.deleted')"
      :success-description="t('optimizations.list.deletedDescription')"
      @confirm="confirmDelete"
      @cancel="confirmOpen = false"
      @close-success="closeSuccess"
    />
  </GridLayout>
</template>