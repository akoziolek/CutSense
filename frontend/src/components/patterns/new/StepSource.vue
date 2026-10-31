<script setup lang="ts">
import { ref } from 'vue'
import { Images, X } from 'lucide-vue-next'
import { useNewPattern } from '@/composables/useNewPattern'

const emit = defineEmits<{ (e: 'error', message: string): void }>()
const { draft, addPhotos, removePhoto } = useNewPattern()

const input = ref<HTMLInputElement | null>(null)
const loading = ref(false)

async function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  const files = Array.from(el.files ?? [])
  el.value = ''
  if (!files.length) return
  loading.value = true
  try {
    await addPhotos(files)
  } catch (err) {
    emit('error', err instanceof Error ? err.message : 'Could not load the selected files.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-8">
    <input
      ref="input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      class="hidden"
      @change="onPick"
    />

    <button
      type="button"
      class="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border-2 border-border bg-popover p-8 text-center transition-shadow hover:shadow-lg disabled:opacity-60"
      :disabled="loading"
      @click="input?.click()"
    >
      <Images class="h-10 w-10" />
      <span class="font-inter text-lg font-bold">Photos library</span>
      <span class="text-xs text-muted-foreground">
        Upload photos of physical paper patterns to digitize and vectorize them.
      </span>
      <span class="text-xs text-muted-foreground">JPG, PNG or WebP, up to 10 MB each</span>
    </button>

    <div v-if="draft.photos.length" class="w-full max-w-2xl space-y-3">
      <h3 class="text-center font-inter text-sm font-semibold">
        Selected photos ({{ draft.photos.length }})
      </h3>
      <ul class="flex flex-wrap justify-center gap-3">
        <li
          v-for="photo in draft.photos"
          :key="photo.id"
          class="relative h-24 w-24 overflow-hidden rounded-md border border-muted bg-card"
        >
          <img :src="photo.url" :alt="photo.file.name" class="h-full w-full object-cover" />
          <button
            type="button"
            class="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow"
            :aria-label="`Remove ${photo.file.name}`"
            @click="removePhoto(photo.id)"
          >
            <X class="h-3 w-3" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>