<script setup lang="ts">
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DiscardChangesModal from '@/components/forms/DiscardChangesModal.vue'
import { useRoute } from 'vue-router'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { ref, watch, computed } from 'vue'
import { api, ApiError } from '@/api/client'
import PatternForm, { type PatternFormPayload } from '@/components/patterns/PatternForm.vue'
import { PatternSize, PatternVisibility, type NameTag } from '@/types/patterns'
import ErrorState from '@/components/common/ErrorState.vue'
import { RotateCcw, ArrowLeft } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import { useAuth } from '@/composables/useAuth'
import { useFormDraft } from '@/composables/useFormDraft'

interface Pattern {
  id: number
  userId?: number
  name: string
  size: PatternSize | string
  description?: string
  tags: NameTag[]
  visibility: PatternVisibility | string
}

const route = useRoute()
const { state: auth } = useAuth()

const patternId = computed(() => Number(route.params.id))
const DRAFT_KEY = computed(() => `pattern_edit_draft_${patternId.value}`)

const draftData = ref<Partial<PatternFormPayload>>({})
const { isDirty, loadDraft, saveDraft, clearDraft } = useFormDraft<PatternFormPayload>(DRAFT_KEY)

const isSubmitting = ref(false)
const submitError = ref('')

const detailsRoute = computed(() => ({ name: 'PatternDetails', params: { id: patternId.value } }))
const { isCancelModalOpen, handleCancel, confirmExit, resetGuard } = useUnsavedChangesGuard({
  isDirty,
  defaultTarget: detailsRoute,
})

const pattern = ref<Pattern | null>(null)
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

const fetchPattern = async (id: number, activeSignal = { active: true }) => {
  clearSkeletonTimer()
  pattern.value = null
  error.value = ''
  isFetching.value = true
  showSkeleton.value = false

  skeletonTimer = setTimeout(() => {
    if (activeSignal.active && isFetching.value) {
      showSkeleton.value = true
    }
  }, 150)

  try {
    const result = await api<Pattern>(`/patterns/${id}`)

    if (activeSignal.active) {
      const currentUserId = auth.user?.id
      const isOwner = result.userId && currentUserId ? result.userId === currentUserId : false

      if (!isOwner) {
        if (result.visibility === PatternVisibility.PUBLIC)
          error.value = 'You do not have access to edit this pattern.'
        else error.value = 'Could not load pattern. Try again'
        return
      }

      pattern.value = result

      const savedDraft = loadDraft()
      draftData.value = savedDraft ?? {
        name: result.name,
        size: result.size,
        description: result.description ?? '',
        tags: result.tags ?? [],
        visibility: result.visibility ?? PatternVisibility.PRIVATE,
      }
    }
  } catch (e) {
    if (activeSignal.active) {
      if (e instanceof ApiError && e.status === 403) {
        error.value = 'Could not load pattern. Please try again.'
      } else {
        error.value =
          e instanceof ApiError ? e.body.message : 'Could not load pattern. Please try again.'
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

const handleFormChange = (payload: Partial<PatternFormPayload>) => {
  if (isCancelModalOpen.value) return
  draftData.value = payload
  saveDraft(payload)
}

const handleConfirmExit = () => {
  clearDraft()
  confirmExit()
}

const handleSubmit = async (payload: PatternFormPayload) => {
  submitError.value = ''
  isSubmitting.value = true

  try {
    await api(`/patterns/${patternId.value}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: payload.name,
        size: payload.size,
        description: payload.description ? payload.description.trim() : null,
        tagIds: payload.tags.map((t) => t.id),
        visibility: payload.visibility,
      }),
    })

    clearDraft()
    confirmExit()
  } catch (e) {
    console.error('Failed to update pattern:', e)
    submitError.value =
      e instanceof ApiError ? e.body.message : 'Could not update pattern. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

watch(
  () => patternId.value,
  (id, _, onCleanup) => {
    if (!id || Number.isNaN(id)) return
    resetGuard()
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    void fetchPattern(id, activeSignal)
  },
  { immediate: true },
)
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader title="Edit Pattern" />
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
          <ErrorState title="Unable to load pattern" :message="error" code="Error">
            <template #actions>
              <Button variant="outline" class="rounded-lg gap-2" @click="fetchPattern(patternId)">
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

        <main v-else key="content">
          <div class="max-w-3xl bg-background rounded-2xl px-4 py-2 space-y-6">
            <PatternForm
              :name="draftData.name"
              :size="draftData.size"
              :description="draftData.description"
              :tags="draftData.tags"
              :visibility="draftData.visibility"
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

    <DiscardChangesModal v-model:open="isCancelModalOpen" @confirm="handleConfirmExit" />
  </GridLayout>
</template>
