<script setup lang="ts">
import { computed } from 'vue'
import { usePatternAddingStore } from '@/stores/addingPatternStore'
import UploadFileCard from '@/components/forms/UploadFileCard.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const patternStore = usePatternAddingStore()

const selectedPhotos = computed<File[]>({
  get: () => patternStore.photos,
  set: (newPhotos) => {
    void patternStore.setPhotos(newPhotos ?? [])
  },
})

const handleSubmit = () => {
  if (selectedPhotos.value.length === 0) return
  emit('next')
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted-foreground">
      {{ $t('patterns.uploadDescription') }}
    </p>

    <main class="flex flex-col items-center px-3 pb-14">
      <UploadFileCard v-model="selectedPhotos" :multiple="true" :max-size-mb="10" :max-files="10" />

      <FormFloatingActions
        :cancel-label="$t('common.actions.cancel')"
        :next-label="$t('common.actions.calibrate')"
        :disabled="selectedPhotos.length === 0"
        @cancel="emit('cancel')"
        @next="handleSubmit"
      />
    </main>
  </div>
</template>
