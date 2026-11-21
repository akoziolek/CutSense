<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import DeleteDialogs from '@/components/common/DeleteDialogs.vue'
import { useBulkDelete } from '@/composables/lists/useBulkDelete'

const props = withDefaults(
  defineProps<{
    basePath: string
    noun: string
    ids: number[]
    visible?: boolean
    description?: string
    successDescription?: (count: number) => string
  }>(),
  {
    visible: true,
  },
)

const emit = defineEmits<{
  (e: 'cancelled'): void
  (e: 'finished'): void
}>()

const count = computed(() => props.ids.length)
const pendingIds = ref<number[]>([])
const confirmCount = ref(0)
const plural = computed(() => (confirmCount.value === 1 ? props.noun : `${props.noun}s`))

const {
  confirmOpen,
  successOpen,
  isDeleting,
  error,
  deletedCount,
  request,
  confirm,
  closeSuccess,
} = useBulkDelete(
  props.basePath,
  () => pendingIds.value,
  () => emit('finished'),
)

const requestDelete = () => {
  if (count.value === 0) return
  pendingIds.value = [...props.ids]
  confirmCount.value = pendingIds.value.length
  request()
}

// Cancel, Esc and a click on the overlay all end up here
const cancel = () => {
  if (isDeleting.value) return
  confirmOpen.value = false
  pendingIds.value = []
  emit('cancelled')
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 translate-x-2 scale-95"
    enter-to-class="opacity-100 translate-x-0 scale-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-x-0 scale-100"
    leave-to-class="opacity-0 translate-x-2 scale-95"
  >
    <div
      v-if="visible && count > 0"
      role="toolbar"
      :aria-label="$t('common.actions.deleteSelected', { count })"
      class="fixed bottom-12 right-6 sm:bottom-14 md:right-10 z-50 flex h-12 sm:h-14 items-center gap-1.5 rounded-xl border border-border bg-background/95 px-2.5 shadow-lg backdrop-blur-md"
    >
      <span
        class="pr-1.5 text-xs sm:text-sm font-semibold font-inter tabular-nums whitespace-nowrap"
      >
        {{ $t('common.status.selectedCount', { count }) }}
      </span>

      <div class="h-5 w-px bg-border mx-0.5" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid="bulk-delete"
        class="h-8 sm:h-9 gap-1.5 border-2 !border-warning-foreground !bg-warning !text-warning-foreground px-5 rounded-md font-semibold font-inter shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        @click="requestDelete"
      >
        <Trash2 class="size-4 stroke-[2.2]" />
        <span>{{ $t('common.actions.delete') }}</span>
      </Button>
    </div>
  </Transition>

  <DeleteDialogs
    :confirm-open="confirmOpen"
    :success-open="successOpen"
    :is-deleting="isDeleting"
    :error="error"
    :title="$t('common.actions.deleteItemsTitle', { count: confirmCount, noun: plural })"
    :description="description ?? $t('common.confirmations.deleteDescription')"
    :success-title="$t('common.actions.deleteSuccessTitle', { noun: plural })"
    :success-description="
      successDescription
        ? successDescription(deletedCount)
        : $t('common.actions.deleteSuccessDescription', { count: deletedCount, noun: plural })
    "
    @confirm="confirm"
    @cancel="cancel"
    @close-success="closeSuccess"
  />
</template>
