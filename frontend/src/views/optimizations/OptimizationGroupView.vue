<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Download,
  FileText,
  Layers,
  Loader2,
  LogIn,
  Maximize2,
  RotateCw,
  RulerDimensionLine,
  Save,
  Scissors,
  Shapes,
  Sparkles,
  Timer,
} from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DetailsCard from '@/components/common/DetailsCard.vue'
import DetailsActions from '@/components/common/DetailsActions.vue'
import DeleteDialogs from '@/components/common/DeleteDialogs.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import StatCard from '@/components/optimizations/StatCard.vue'
import OptimizationPreview from '@/components/optimizations/OptimizationPreview.vue'
import SaveOptimizationModal from '@/components/optimizations/SaveOptimizationModal.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { login, useAuth } from '@/stores/authStore'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { useDeleteResource } from '@/composables/resources/useDeleteResource'
import {
  useOptimizationGroup,
  type GroupSource,
} from '@/composables/optimization/useOptimizationGroup'
import { toPreviewLayout } from '@/utils/optimizationLayout'
import type { MetaItem } from '@/types/details'
import type { OptimizationView } from '@/types/optimization'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { state: auth } = useAuth()

const split = (value: unknown) =>
  typeof value === 'string' ? value.split(',').filter(Boolean) : []

// ?runs=... : fresh runs, ?ids=... : saved optimizations
const source = computed<GroupSource>(() => {
  const runs = split(route.query.runs)
  return runs.length ? { kind: 'runs', ids: runs } : { kind: 'saved', ids: split(route.query.ids) }
})
const isSavedGroup = computed(() => source.value.kind === 'saved')

const {
  items,
  isFetching,
  error,
  isNotFound,
  groupName,
  allSaved,
  totals,
  isSaving,
  saveError,
  isRenaming,
  renameError,
  downloadingKey,
  fetchAll,
  saveAll,
  rename,
  downloadPdf,
} = useOptimizationGroup(source)

const isSaveOpen = ref(false)
const isEditOpen = ref(false)
const isExpanded = ref(false)
const isDownloadingAll = ref(false)
const downloadAllPdfs = async (format: 'a4' | 'actual') => {
  if (isDownloadingAll.value || downloadingKey.value !== null) return

  isDownloadingAll.value = true
  try {
    for (const [index, optimization] of items.value.entries()) {
      if (optimization.wasSuccessful) {
        await downloadPdf(optimization, format, `fabric-${index + 1}`)
      }
    }
  } finally {
    isDownloadingAll.value = false
  }
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
  basePath: '/optimizations',
  noun: 'optimization',
  redirectTo: '/optimizations',
  getId: () => source.value.ids[0] ?? '',
})

const layouts = computed(() => items.value.map(toPreviewLayout))

const formatAreaM2 = (mm2: number) => `${(mm2 / 1_000_000).toFixed(2).replace('.', ',')} m²`
const formatLengthM = (mm: number) => `${(mm / 1000).toFixed(2).replace('.', ',')} m`

const fabricTitle = (o: OptimizationView, index: number) =>
  `${index + 1}. ${o.fabric.name ?? `${o.fabric.widthMm / 10} × ${o.fabric.lengthMm / 10} cm`}`

const metaItems = (o: OptimizationView): MetaItem[] => [
  { icon: Sparkles, label: t('optimizations.algorithm'), value: o.algorithmName },
  {
    icon: Scissors,
    label: t('optimizations.allowances'),
    value: `${o.seamAllowanceMm} mm / ${o.cuttingAllowanceMm} mm`,
  },
]

const handleSave = async (name: string) => {
  const ids = await saveAll(name)
  if (!ids) return
  isSaveOpen.value = false
  // from now on the page is addressed by the saved ids, so it survives a reload
  await router.replace({ name: 'OptimizationGroup', query: { ids: ids.join(',') } })
}

const handleRename = async (name: string) => {
  if (await rename(name)) isEditOpen.value = false
}

onMounted(() => {
  useOptimizationAddingStore().reset()
})

watch(
  () => route.fullPath,
  (_, __, onCleanup) => {
    const signal = { active: true }
    onCleanup(() => {
      signal.active = false
    })
    void fetchAll(signal)
  },
  { immediate: true },
)
</script>

<template>
  <GridLayout>
    <div class="mx-auto w-full max-w-screen-2xl space-y-8 px-4 py-6 sm:px-12 sm:py-10 lg:px-14">
      <PageHeader :title="groupName ?? t('optimizations.resultsTitle')" :show-back="false">
        <template #actions>
          <div class="flex flex-wrap items-center justify-end gap-2.5 font-inter">
            <DropdownMenu v-if="items.some((optimization) => optimization.wasSuccessful)">
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  class="h-9 gap-2 rounded-lg border border-foreground bg-background px-4 font-medium text-foreground shadow-2xs hover:bg-muted/20"
                  :disabled="isDownloadingAll || downloadingKey !== null"
                >
                  <Loader2
                    v-if="isDownloadingAll || downloadingKey !== null"
                    class="h-4 w-4 animate-spin"
                  />
                  <Download v-else class="h-4.5 w-4.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                class="w-64 max-w-[calc(100vw-2rem)] border border-foreground/30 p-1.5 shadow-md sm:w-72"
              >
                <DropdownMenuItem
                  class="cursor-pointer items-start gap-2.5 rounded-md p-2.5"
                  @select="downloadAllPdfs('a4')"
                >
                  <FileText class="mt-0.5 h-4 w-4 shrink-0" />
                  <div class="flex flex-col gap-0.5">
                    <span class="font-medium leading-tight">
                      {{ t('optimizations.downloadPdfA4') }}
                    </span>
                    <span class="text-xs leading-snug text-muted-foreground">
                      {{ t('optimizations.downloadPdfA4Description') }}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="cursor-pointer items-start gap-2.5 rounded-md p-2.5"
                  @select="downloadAllPdfs('actual')"
                >
                  <Maximize2 class="mt-0.5 h-4 w-4 shrink-0" />
                  <div class="flex flex-col gap-0.5">
                    <span class="font-medium leading-tight">
                      {{ t('optimizations.downloadPdfActual') }}
                    </span>
                    <span class="text-xs leading-snug text-muted-foreground">
                      {{ t('optimizations.downloadPdfActualDescription') }}
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <template v-if="items.length && totals.wasSuccessful && !isSavedGroup && !allSaved">
              <Button
                v-if="auth.user"
                class="h-9 px-4 gap-2 rounded-lg border border-foreground text-foreground bg-brand-pink/50 hover:bg-brand-pink/80 cursor-pointer font-medium shadow-2xs"
                @click="isSaveOpen = true"
              >
                <Save class="h-4.5 w-4.5" />
                Save all ({{ items.length }})
              </Button>
              <Button
                v-else
                variant="outline"
                class="h-9 gap-2 rounded-lg border border-foreground px-4 font-medium"
                @click="login(route.fullPath)"
              >
                <LogIn class="h-4.5 w-4.5" />
                {{ t('optimizations.signInToSave') }}
              </Button>
            </template>

            <DetailsActions
              v-if="isSavedGroup && items.length"
              :edit-label="t('common.actions.edit')"
              @edit="isEditOpen = true"
              @delete="requestDelete"
            />
          </div>
        </template>
      </PageHeader>

      <div v-if="isFetching" class="space-y-6">
        <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton v-for="n in 6" :key="n" class="h-24 w-full rounded-md" />
        </div>
        <Skeleton class="h-[460px] w-full rounded-md" />
      </div>

      <ErrorState
        v-else-if="error"
        :title="t(isNotFound ? 'optimizations.notFound' : 'optimizations.unableToLoad')"
        :message="isNotFound ? t('optimizations.notFoundMessage') : error"
        :code="t(isNotFound ? 'common.errors.notFoundCode' : 'common.errors.errorCode')"
        :retry-label="isNotFound ? undefined : t('common.actions.tryAgain')"
        :back-label="t('optimizations.newOptimization')"
        :back-to="{ name: 'OptimizationNew' }"
        @retry="fetchAll()"
      />

      <template v-else-if="items.length">
        <!-- one tab per fabric -->
        <Tabs default-value="0" class="space-y-4">
          <TabsList class="h-auto flex-wrap justify-start">
            <TabsTrigger v-for="(o, i) in items" :key="i" :value="String(i)">
              {{ fabricTitle(o, i) }}
            </TabsTrigger>
          </TabsList>

          <TabsContent v-for="(o, i) in items" :key="i" :value="String(i)">
            <div class="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
              <div :class="isExpanded ? 'lg:col-span-2' : 'lg:col-span-1'" class="w-full space-y-3">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-xl font-bold font-inter tracking-tight">
                    {{ t('optimizations.placementOfPieces') }}
                  </h2>

                  <!-- prints only this fabric -->
                  <DropdownMenu v-if="o.wasSuccessful">
                    <DropdownMenuTrigger as-child>
                      <Button
                        variant="outline"
                        class="h-9 gap-2 rounded-lg border border-foreground px-4"
                        :disabled="isDownloadingAll || downloadingKey !== null"
                      >
                        <Loader2
                          v-if="downloadingKey === String(o.runId ?? o.id)"
                          class="h-4 w-4 animate-spin"
                        />
                        <Download v-else class="h-4.5 w-4.5" />
                        PDF
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      class="w-64 max-w-[calc(100vw-2rem)] border border-foreground/30 p-1.5 shadow-md sm:w-72"
                    >
                      <DropdownMenuItem
                        class="cursor-pointer items-start gap-2.5 rounded-md p-2.5"
                        @select="downloadPdf(o, 'a4')"
                      >
                        <FileText class="mt-0.5 h-4 w-4 shrink-0" />
                        <div class="flex flex-col gap-0.5">
                          <span class="font-medium leading-tight">
                            {{ t('optimizations.downloadPdfA4') }}
                          </span>
                          <span class="text-xs leading-snug text-muted-foreground">
                            {{ t('optimizations.downloadPdfA4Description') }}
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        class="cursor-pointer items-start gap-2.5 rounded-md p-2.5"
                        @select="downloadPdf(o, 'actual')"
                      >
                        <Maximize2 class="mt-0.5 h-4 w-4 shrink-0" />
                        <div class="flex flex-col gap-0.5">
                          <span class="font-medium leading-tight">
                            {{ t('optimizations.downloadPdfActual') }}
                          </span>
                          <span class="text-xs leading-snug text-muted-foreground">
                            {{ t('optimizations.downloadPdfActualDescription') }}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <ErrorState
                  v-if="!o.wasSuccessful"
                  :title="t('optimizations.unsuccessful')"
                  :message="t('optimizations.failedDescription')"
                  :code="t('common.errors.errorCode')"
                />
                <OptimizationPreview
                  v-else
                  v-model:is-expanded="isExpanded"
                  :fabric-shape="layouts[i]!.fabricBoundary"
                  :pieces="layouts[i]!.pieces"
                  :coordinate-origin-mm="layouts[i]!.coordinateOriginMm"
                  :canvas-width-mm="layouts[i]!.widthMm"
                  :canvas-height-mm="layouts[i]!.heightMm"
                  :seam-allowance-mm="o.seamAllowanceMm"
                  :cutting-allowance-mm="o.cuttingAllowanceMm"
                  :photo-url="null"
                />
              </div>

              <div
                v-if="o.wasSuccessful"
                :class="
                  isExpanded
                    ? 'grid grid-cols-1 gap-8 pt-2 lg:col-span-2 lg:grid-cols-2'
                    : 'space-y-7 lg:col-span-1'
                "
              >
                <section class="space-y-3">
                  <h2 class="text-xl font-bold font-inter tracking-tight">
                    {{ t('optimizations.detailsTitle') }}
                  </h2>
                  <DetailsCard :meta-items="metaItems(o)">
                    <div class="space-y-3 text-sm">
                      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Layers class="h-4 w-4 shrink-0" />
                        <RouterLink
                          v-if="o.fabric.fabricId"
                          :to="`/fabrics/${o.fabric.fabricId}`"
                          class="font-bold font-inter hover:underline"
                        >
                          {{
                            o.fabric.name ??
                            `${t('optimizations.libraryFabric')} #${o.fabric.fabricId}`
                          }}
                        </RouterLink>
                        <span v-else class="font-bold font-inter">
                          {{ t('optimizations.customFabric') }}
                        </span>
                        <span class="text-xs text-muted-foreground">
                          {{ o.fabric.widthMm }} × {{ o.fabric.lengthMm }} mm
                        </span>
                      </div>

                      <div v-if="o.pattern" class="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Shapes class="h-4 w-4 shrink-0" />
                        <RouterLink
                          :to="`/patterns/${o.pattern.id}`"
                          class="font-bold font-inter hover:underline"
                        >
                          {{ o.pattern.name }}
                        </RouterLink>
                        <span class="text-xs text-muted-foreground">
                          {{ t('common.details.size') }}: {{ o.pattern.size }}
                        </span>
                      </div>
                    </div>
                  </DetailsCard>
                </section>

                <section class="space-y-3">
                  <h2 class="text-xl font-bold font-inter tracking-tight">
                    {{ t('optimizations.statistics') }} · {{ fabricTitle(o, i) }}
                  </h2>
                  <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <StatCard
                      :label="t('optimizations.remainingFabric')"
                      :value="formatAreaM2(o.stats.remainingFabricArea)"
                      :subtext="`${o.stats.remainingFabricPercentage}% ${t('optimizations.ofTotalFabric')}`"
                      :icon="RulerDimensionLine"
                    />
                    <StatCard
                      :label="t('optimizations.waste')"
                      :value="formatAreaM2(o.stats.wasteArea)"
                      :icon="Scissors"
                    >
                      <template #subtext>
                        <span class="font-semibold text-destructive">{{ o.stats.wastePercentage }}%</span>
                        {{ t('optimizations.ofTotalFabric') }}
                      </template>
                    </StatCard>
                    <StatCard
                      :label="t('optimizations.usableScraps')"
                      :value="formatAreaM2(o.stats.usableScrapsArea)"
                      :icon="RotateCw"
                    >
                      <template #subtext>
                        <span class="font-semibold text-brand-green-foreground">
                          {{ o.stats.usableScrapsPercentage }}%
                        </span>
                        {{ t('optimizations.ofTotalFabric') }}
                      </template>
                    </StatCard>
                    <StatCard
                      :label="t('optimizations.executionTime')"
                      :value="`${o.executionTime} ms`"
                      :icon="Timer"
                    />
                  </div>
                </section>
              </div>
            </div>
          </TabsContent>
        </Tabs>

                <!-- combined statistics -->
        <section class="space-y-3">
          <h2 class="text-xl font-bold font-inter tracking-tight">
            {{ t('optimizations.statistics') }}
          </h2>
          <p v-if="!totals.wasSuccessful" class="text-sm text-destructive" role="alert">
            {{ t('optimizations.failedDescription') }}
          </p>

          <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Fabrics" :value="items.length" :icon="Layers" />
            <StatCard
              label="Total fabric length used"
              :value="formatLengthM(totals.minLengthMm)"
              :icon="RulerDimensionLine"
            />
            <StatCard
              :label="t('optimizations.remainingFabric')"
              :value="formatAreaM2(totals.remaining)"
              :subtext="`${totals.remainingPct}% ${t('optimizations.ofTotalFabric')}`"
              :icon="RulerDimensionLine"
            />
            <StatCard
              :label="t('optimizations.waste')"
              :value="formatAreaM2(totals.waste)"
              :icon="Scissors"
            >
              <template #subtext>
                <span class="font-semibold text-destructive">{{ totals.wastePct }}%</span>
                {{ t('optimizations.ofTotalFabric') }}
              </template>
            </StatCard>
            <StatCard
              :label="t('optimizations.usableScraps')"
              :value="formatAreaM2(totals.usable)"
              :icon="RotateCw"
            >
              <template #subtext>
                <span class="font-semibold text-brand-green-foreground">{{ totals.usablePct }}%</span>
                {{ t('optimizations.ofTotalFabric') }}
              </template>
            </StatCard>
            <StatCard
              :label="t('optimizations.executionTime')"
              :value="`${totals.executionTime} ms`"
              :icon="Timer"
            />
          </div>
        </section>
        
      </template>
    </div>

    <SaveOptimizationModal
      v-model:open="isSaveOpen"
      :loading="isSaving"
      :error="saveError"
      @save="handleSave"
    />
    <SaveOptimizationModal
      v-model:open="isEditOpen"
      :initial-name="groupName"
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
      :title="
        t('optimizations.list.deleteTitle', {
          name: groupName ?? t('optimizations.list.thisOptimization'),
        })
      "
      :description="t('optimizations.list.deleteDescription')"
      :success-title="t('optimizations.list.deleted')"
      :success-description="t('optimizations.list.deletedDescription')"
      @confirm="confirmDelete"
      @cancel="confirmOpen = false"
      @close-success="closeSuccess"
    />
  </GridLayout>
</template>