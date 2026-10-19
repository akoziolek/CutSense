<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import MessageDialog from '@/components/common/MessageDialog.vue'
import StepSource from '@/components/patterns/new/StepSource.vue'
import StepScale from '@/components/patterns/new/StepScale.vue'
import StepPieces from '@/components/patterns/new/StepPieces.vue'
import StepDetails from '@/components/patterns/new/StepDetails.vue'
import { Button } from '@/components/ui/button'
import { useNewPattern } from '@/composables/useNewPattern'

const TITLES = ['Pattern source', 'Pattern configuration', 'Detected pieces', 'Pattern details']

const router = useRouter()
const { draft, hasData, generatePieces, reset } = useNewPattern()

const step = ref(1)
const loadError = ref('')
const cancelOpen = ref(false)
const savedOpen = ref(false)
const savedName = ref('')

const canNext = computed(() => {
  switch (step.value) {
    case 1:
      return draft.photos.length > 0
    case 3:
      return draft.pieces.length > 0
    case 4:
      return !!draft.details.name.trim() && !!draft.details.size && !!draft.details.visibility
    default:
      return true
  }
})

function next() {
  if (!canNext.value) return
  if (step.value === 2) generatePieces()
  if (step.value < 4) {
    step.value++
    return
  }
  // TODO: send the pattern to the API (POST /patterns) once the backend task is done
  savedName.value = draft.details.name.trim()
  savedOpen.value = true
}

function askCancel() {
  if (hasData.value) cancelOpen.value = true
  else leave()
}

function back() {
  if (step.value > 1) step.value--
  else askCancel()
}

function leave() {
  cancelOpen.value = false
  reset()
  router.push('/patterns')
}

function onSavedClosed(open: boolean) {
  if (open) return
  savedOpen.value = false
  leave()
}

// closing the tab or the browser interrupts the process, nothing is saved
const warnBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasData.value) e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', warnBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload))
</script>

<template>
  <GridLayout>
      <div class="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-12 sm:py-10 lg:px-14">
      <div class="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8 shrink-0"
          aria-label="Back"
          @click="back"
        >
          <ArrowLeft class="w-4 h-4" />
        </Button>
        <PageHeader :title="TITLES[step - 1]" class="flex-1">
          <template #actions>
            <span class="text-xs text-muted-foreground">Step {{ step }} of 4</span>
          </template>
        </PageHeader>
      </div>

      <p v-if="step === 2" class="text-sm text-muted-foreground">
        Scale your fabric pattern to the grid. Use a known reference object, like a credit card, as a
        scale.
      </p>

      <StepSource v-if="step === 1" @error="loadError = $event" />
      <StepScale v-else-if="step === 2" />
      <StepPieces v-else-if="step === 3" />
      <StepDetails v-else />

      <div class="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          class="h-9 rounded-lg text-xs sm:text-sm font-semibold border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
          @click="askCancel"
        >
          Cancel
        </Button>
        <Button
          type="button"
          :disabled="!canNext"
          class="h-9 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:opacity-100 disabled:cursor-not-allowed"
          @click="next"
        >
          {{ step === 4 ? 'Save' : 'Next' }}
          <Check class="w-3.5 h-3.5 stroke-[2.5]" />
        </Button>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="cancelOpen"
      title="Discard unsaved changes?"
      description="Exiting now will cause all entered data to be lost."
      confirm-label="Discard"
      cancel-label="Keep editing"
      @confirm="leave"
    />
    <MessageDialog
      :open="!!loadError"
      title="Unable to load image"
      :description="loadError"
      @update:open="(open) => !open && (loadError = '')"
    />
    <MessageDialog
      :open="savedOpen"
      title="Pattern saved"
      :description="`${savedName} was added to your library.`"
      @update:open="onSavedClosed"
    />
  </GridLayout>
</template>