<script setup lang="ts">
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DiscardNewFabricModal from '@/components/forms/DiscardChangesModal.vue'
import { useRoute } from 'vue-router'
import { useEditFabricFormGuard } from '@/composables/useEditFormGuard'
import { onMounted, ref, watch, computed } from 'vue'
import { api, ApiError } from '@/api/client'
import FabricForm, { type FabricFormPayload } from '@/components/fabrics/FabricForm.vue'
import type { FabricResponse } from '@/types/fabric'
import ErrorState from '@/components/common/ErrorState.vue'
import { RotateCcw } from 'lucide-vue-next'
import { ArrowLeft } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'

const route = useRoute()
const fabricId = computed(() => Number(route.params.id))
const DRAFT_KEY = computed(() => `fabric_edit_draft_${fabricId.value}`)

const draftData = ref<Partial<FabricFormPayload>>({})
const isDirty = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')

const detailsRoute = computed(() => ({ name: 'FabricDetails', params: { id: fabricId.value } }))
const { isCancelModalOpen, handleCancel, confirmExit, resetGuard } = useEditFabricFormGuard(
  isDirty,
  detailsRoute.value,
)

const fabric = ref<FabricResponse | null>(null)
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

const fetchFabric = async (id: number, activeSignal = { active: true }) => {
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
    const result = await api<FabricResponse>(`/fabrics/${id}`)
    if (activeSignal.active) {
      fabric.value = result

      const savedDraft = localStorage.getItem(DRAFT_KEY.value)
      if (savedDraft) {
        try {
          draftData.value = JSON.parse(savedDraft)
          isDirty.value = true
        } catch (e) {
          console.error('Failed to parse draft from localStorage', e)
          localStorage.removeItem(DRAFT_KEY.value)
          draftData.value = {
            name: result.name,
            description: result.description ?? '',
            tags: result.tags ?? [],
          }
          isDirty.value = false
        }
      } else {
        draftData.value = {
          name: result.name,
          description: result.description ?? '',
          tags: result.tags ?? [],
        }
        isDirty.value = false
      }
    }
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

const handleFormChange = (payload: Partial<FabricFormPayload>) => {
  if (isCancelModalOpen.value) return
  isDirty.value = true
  draftData.value = payload
  localStorage.setItem(DRAFT_KEY.value, JSON.stringify(payload))
}

const clearDraft = () => {
  isDirty.value = false
  localStorage.removeItem(DRAFT_KEY.value)
}

const handleConfirmExit = () => {
  clearDraft()
  confirmExit()
}

const handleSubmit = async (payload: FabricFormPayload) => {
  submitError.value = ''
  isSubmitting.value = true

  try {
    await api(`/fabrics/${fabricId.value}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: payload.name,
        description: payload.description ? payload.description.trim() : null,
        tagIds: payload.tags.map((t) => t.id),
      }),
    })

    clearDraft()
    isDirty.value = false
    confirmExit()
  } catch (e) {
    console.error('Failed to update fabric:', e)
    submitError.value =
      e instanceof ApiError ? e.body.message : 'Could not update fabric. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

watch(
  () => fabricId.value,
  (id, _, onCleanup) => {
    if (!id || Number.isNaN(id)) return
    resetGuard()
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    void fetchFabric(id, activeSignal)
  },
  { immediate: true },
)

onMounted(() => {
  const savedDraft = localStorage.getItem(DRAFT_KEY.value)
  if (savedDraft) {
    try {
      draftData.value = JSON.parse(savedDraft)
      isDirty.value = true
    } catch (e) {
      console.error('Failed to parse draft from localStorage', e)
      localStorage.removeItem(DRAFT_KEY.value)
    }
  }
})
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader title="Edit Fabric" />
      <Transition
        mode="out-in"
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <main v-if="error" key="error">
          <ErrorState title="Unable to load fabric" :message="error" code="Error">
            <template #actions>
              <Button variant="outline" class="rounded-lg gap-2" @click="fetchFabric(fabricId)">
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

        <main v-else key="content">
          <div class="max-w-3xl bg-background rounded-2xl px-4 py-2 space-y-6">
            <FabricForm
              :name="draftData.name"
              :description="draftData.description"
              :tags="draftData.tags"
              :is-loading="showSkeleton || isFetching"
              :is-submitting="isSubmitting"
              :submit-error="submitError"
              @cancel="handleCancel"
              @change="handleFormChange"
              @submit="handleSubmit"
            />
          </div>
        </main>
      </Transition>
    </div>

    <DiscardNewFabricModal v-model:open="isCancelModalOpen" @confirm="handleConfirmExit" />
  </GridLayout>
</template>
