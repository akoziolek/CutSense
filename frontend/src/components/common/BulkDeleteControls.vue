<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import DeleteDialogs from '@/components/common/DeleteDialogs.vue'
import { useBulkDelete } from '@/composables/useBulkDelete'

const props = defineProps<{
  basePath: string // '/fabrics', '/patterns'
  noun: string // singular: 'fabric', 'pattern'
  ids: number[]
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'cancelled'): void
  (e: 'finished'): void
}>()

const count = computed(() => props.ids.length)
const confirmCount = ref(0)
const plural = computed(() => (confirmCount.value === 1 ? props.noun : `${props.noun}s`))

const { confirmOpen, successOpen, isDeleting, error, deletedCount, request, confirm, closeSuccess } =
  useBulkDelete(props.basePath, () => props.ids, () => emit('finished'))

const requestDelete = () => {
  if (count.value === 0) return
  confirmCount.value = count.value
  request()
}

// Cancel, Esc and a click on the overlay all end up here
const cancel = () => {
  if (isDeleting.value) return
  confirmOpen.value = false
  emit('cancelled')
}
</script>

<template>
  <div v-if="visible" class="fixed bottom-28 right-6 sm:bottom-32 md:right-10 z-50">
    <Button
      type="button"
      data-testid="bulk-delete"
      :aria-label="`Delete ${count} selected`"
      :aria-disabled="count === 0"
      :title="count === 0 ? 'Long press or right-click a card to select it' : undefined"
      :class="[
        'h-12 w-12 sm:h-14 sm:w-14 rounded-xl p-0 shadow-lg transition-all duration-200',
        count > 0
          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 active:scale-95 cursor-pointer'
          : 'bg-muted text-muted-foreground cursor-not-allowed',
      ]"
      @click="requestDelete"
    >
      <Trash2 class="!h-6 !w-6 sm:!h-7 sm:!w-7 stroke-[2] shrink-0" />
    </Button>
    <span
      v-if="count > 0"
      class="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background"
    >
      {{ count }}
    </span>
  </div>

  <DeleteDialogs
    :confirm-open="confirmOpen"
    :success-open="successOpen"
    :is-deleting="isDeleting"
    :error="error"
    :title="`Delete ${confirmCount} ${plural}?`"
    description="This action cannot be undone and will permanently remove all associated optimizations."
    :success-title="`${noun[0]!.toUpperCase()}${noun.slice(1)}s deleted`"
    :success-description="`${deletedCount} ${deletedCount === 1 ? `${noun} was` : `${noun}s were`} deleted together with ${deletedCount === 1 ? 'its' : 'their'} optimizations.`"
    @confirm="confirm"
    @cancel="cancel"
    @close-success="closeSuccess"
  />
</template>