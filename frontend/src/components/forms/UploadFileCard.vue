<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  UploadCloud,
  FileImage,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-vue-next'

interface Props {
  multiple?: boolean
  maxSizeMb?: number
  maxFiles?: number
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  maxSizeMb: 5,
  maxFiles: 10,
})

const model = defineModel<File | File[] | null>({ default: null })

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const activeIndex = ref(0)
const previewUrls = ref<string[]>([])

const files = computed<File[]>(() => {
  if (!model.value) return []
  return Array.isArray(model.value) ? model.value : [model.value]
})

const currentFile = computed<File | null>(() => files.value[activeIndex.value] ?? null)

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const cleanupUrls = () => {
  previewUrls.value.forEach((url) => URL.revokeObjectURL(url))
  previewUrls.value = []
}

watch(
  files,
  (newFiles) => {
    cleanupUrls()
    previewUrls.value = newFiles.map((file) => URL.createObjectURL(file))

    if (activeIndex.value >= newFiles.length) {
      activeIndex.value = Math.max(0, newFiles.length - 1)
    }
  },
  { immediate: true, deep: true },
)

const updateModel = (updatedFiles: File[]) => {
  if (props.multiple) {
    model.value = updatedFiles
  } else {
    model.value = updatedFiles[0] ?? null
  }
}

const processFiles = (incomingFiles: FileList | File[]) => {
  const validFiles: File[] = []
  const maxBytes = props.maxSizeMb * 1024 * 1024

  Array.from(incomingFiles).forEach((file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file format', {
        description: `${file.name} is not an image (JPG, PNG, WEBP).`,
      })
      return
    }

    if (file.size > maxBytes) {
      toast.error('File too large', {
        description: `${file.name} exceeds allowed limit of ${props.maxSizeMb} MB.`,
      })
      return
    }

    validFiles.push(file)
  })

  if (validFiles.length === 0) return

  if (props.multiple) {
    const combined = [...files.value, ...validFiles]
    if (combined.length > props.maxFiles) {
      toast.error('Too many files', {
        description: `Maximum allowed files limit is ${props.maxFiles}.`,
      })
      updateModel(combined.slice(0, props.maxFiles))
    } else {
      updateModel(combined)
    }
    activeIndex.value = Math.min(files.value.length + validFiles.length - 1, props.maxFiles - 1)
  } else {
    const firstFile = validFiles[0]
    if (!firstFile) return
    updateModel([firstFile])
    activeIndex.value = 0
  }
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    processFiles(target.files)
    target.value = ''
  }
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    processFiles(e.dataTransfer.files)
  }
}

const removeImage = (indexToRemove: number) => {
  const updated = files.value.filter((_, idx) => idx !== indexToRemove)
  updateModel(updated)
}

const prevImage = () => {
  if (files.value.length === 0) return
  activeIndex.value = (activeIndex.value - 1 + files.value.length) % files.value.length
}

const nextImage = () => {
  if (files.value.length === 0) return
  activeIndex.value = (activeIndex.value + 1) % files.value.length
}

onUnmounted(() => {
  cleanupUrls()
})
</script>

<template>
  <div class="w-full max-w-4xl mx-auto">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      :multiple="props.multiple"
      class="hidden"
      @change="handleFileChange"
    />

    <div
      v-if="files.length === 0"
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
          {{ props.multiple ? 'High-resolution photos' : 'High-resolution photo' }}
          (PNG, JPG, WEBP up to {{ props.maxSizeMb }}MB)
        </p>
      </div>
    </div>

    <div
      v-else
      class="relative w-full rounded-2xl border border-muted bg-card shadow-sm overflow-hidden"
    >
      <div
        class="relative w-full h-[280px] sm:h-[360px] md:h-[340px] bg-muted/20 overflow-hidden flex items-center justify-center group select-none shrink-0"
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          class="absolute top-3 right-3 z-10 p-5 h-8 w-8 bg-destructive/10 rounded-lg transition-colors cursor-pointer text-destructive hover:bg-destructive/15 hover:text-destructive"
          title="Remove image"
          @click.stop="removeImage(activeIndex)"
        >
          <Trash2 class="h-4 w-4" />
          <span class="sr-only">Delete selected</span>
        </Button>
        <div
          v-if="props.multiple && files.length > 1"
          class="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-background/80 backdrop-blur-md shadow-sm text-xs font-semibold text-foreground"
        >
          {{ activeIndex + 1 }} / {{ files.length }}
        </div>

        <template v-if="files.length > 1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            class="absolute left-3 z-10 h-9 w-9 bg-secondary hover:bg-(--secondary)/80 text-foreground border-none shadow-none rounded-full cursor-pointer"
            @click.stop="prevImage"
          >
            <ChevronLeft class="w-5 h-5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            class="absolute right-3 z-10 h-9 w-9 bg-secondary hover:bg-(--secondary)/80 text-foreground border-none shadow-none rounded-full cursor-pointer"
            @click.stop="nextImage"
          >
            <ChevronRight class="w-5 h-5" />
          </Button>
        </template>

        <img
          v-if="previewUrls[activeIndex]"
          :src="previewUrls[activeIndex]"
          :alt="currentFile?.name"
          class="w-full h-full object-contain p-3 block"
        />
        <div v-else class="flex flex-col items-center text-muted-foreground p-6">
          <FileImage class="h-12 w-12 mb-2 stroke-1" />
          <span class="text-xs">No preview available</span>
        </div>
      </div>
      <div class="p-4 sm:p-5 flex items-center justify-between gap-4 border-t border-muted bg-card">
        <div v-if="currentFile" class="flex items-center gap-3 min-w-0">
          <div class="p-2.5 rounded-xl bg-muted/30 text-primary shrink-0">
            <FileImage class="h-5 w-5" />
          </div>
          <div class="truncate">
            <p class="text-sm font-semibold text-foreground truncate">
              {{ currentFile.name }}
            </p>
            <p class="text-xs text-muted-foreground">{{ formatBytes(currentFile.size) }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <Button
            v-if="props.multiple && files.length < props.maxFiles"
            type="button"
            variant="outline"
            size="sm"
            class="text-xs font-medium font-inter rounded-md bg-white hover:bg-white hover:-translate-y-0.5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
            @click="fileInputRef?.click()"
          >
            <Plus class="w-3.5 h-3.5" />
            Add photos
          </Button>

          <Button
            v-else-if="!props.multiple"
            type="button"
            variant="outline"
            size="sm"
            class="text-xs font-medium rounded-md bg-white hover:bg-white hover:-translate-y-0.5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
            @click="fileInputRef?.click()"
          >
            <RefreshCw class="w-3.5 h-3.5 mr-1.5" />
            Change photo
          </Button>
        </div>
      </div>
      <div
        v-if="props.multiple && files.length > 1"
        class="flex items-center gap-2 p-3 overflow-x-auto border-t border-muted bg-muted/10 scrollbar-thin"
      >
        <button
          v-for="(url, idx) in previewUrls"
          :key="idx"
          type="button"
          @click="activeIndex = idx"
          :class="[
            'relative h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer',
            activeIndex === idx
              ? 'border-primary ring-2 ring-primary/20 scale-105'
              : 'border-transparent opacity-60 hover:opacity-100',
          ]"
        >
          <img :src="url" :alt="files[idx]?.name" class="w-full h-full object-cover" />
        </button>
      </div>
    </div>
  </div>
</template>
