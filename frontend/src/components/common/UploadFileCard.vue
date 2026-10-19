<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { UploadCloud, FileImage, RefreshCw } from 'lucide-vue-next'

const file = defineModel<File | null>({ default: null })

const fileInputRef = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)
const isDragging = ref(false)

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

watch(
  file,
  (newFile) => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
    if (newFile) {
      previewUrl.value = URL.createObjectURL(newFile)
    }
  },
  { immediate: true },
)

const processFile = (selectedFile: File) => {
  if (!selectedFile.type.startsWith('image/')) {
    toast.error('Invalid file format', {
      description: 'Selected file must be an image (JPG, PNG, WEBP).',
    })
    return
  }

  if (selectedFile.size > 5 * 1024 * 1024) {
    toast.error('File too large', {
      description: 'Maximum allowed file size is 5 MB.',
    })
    return
  }

  file.value = selectedFile
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    processFile(target.files[0])
  }
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    processFile(e.dataTransfer.files[0])
  }
}

onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <div class="w-full max-w-4xl mx-auto">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileChange"
    />

    <div
      v-if="!file"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInputRef?.click()"
      :class="[
        'group relative flex flex-col items-center justify-center p-6 sm:p-10',
        'min-h-[280px] sm:min-h-[350px] w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center bg-card',
        isDragging
          ? 'border-primary/30 bg-primary/5 scale-[0.99]'
          : 'border-muted hover:border-primary/30 hover:bg-accent/40 shadow-xs hover:shadow-md',
      ]"
    >
      <div
        class="p-4 rounded-full bg-muted/60 border border-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors mb-4"
      >
        <UploadCloud
          class="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors"
        />
      </div>

      <div class="space-y-1">
        <p class="text-base font-semibold text-foreground">
          Click to upload <span class="font-normal text-muted-foreground">or drag & drop</span>
        </p>
        <p class="text-xs text-muted-foreground">
          High-resolution fabric photo (PNG, JPG, WEBP up to 5MB)
        </p>
      </div>
    </div>

    <div
      v-else
      class="relative w-full rounded-2xl border border-muted bg-card shadow-sm overflow-hidden transition-all"
    >
      <div
        class="relative w-full min-h-[250px] max-h-[40vh] bg-muted/20 overflow-hidden flex items-center justify-center group"
      >
        <img
          v-if="previewUrl"
          :src="previewUrl"
          :alt="file.name"
          class="max-w-full max-h-[55vh] w-auto h-auto object-contain rounded-lg transition-transform duration-500 group-hover:scale-[1.01]"
        />
        <div v-else class="flex flex-col items-center text-muted-foreground p-6">
          <FileImage class="h-12 w-12 mb-2 stroke-1" />
          <span class="text-xs">No preview available</span>
        </div>
      </div>

      <div class="p-4 sm:p-5 flex items-center justify-between gap-4 border-t border-muted bg-card">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2.5 rounded-xl bg-muted/30 text-primary shrink-0">
            <FileImage class="h-5 w-5" />
          </div>
          <div class="truncate">
            <p class="text-sm font-semibold text-foreground truncate">{{ file.name }}</p>
            <p class="text-xs text-muted-foreground">{{ formatBytes(file.size) }}</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="shrink-0 text-xs font-medium rounded-md bg-white hover:bg-white hover:-translate-y-0.5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
          @click="fileInputRef?.click()"
        >
          <RefreshCw class="w-3.5 h-3.5 mr-1.5" />
          Change photo
        </Button>
      </div>
    </div>
  </div>
</template>
