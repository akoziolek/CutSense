<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Attachment,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Button } from '@/components/ui/button'
import { UploadCloud, FileImage, Paperclip, X, Trash2 } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    loading?: boolean
    description: string
  }>(),
  {
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit', file: File): void
  (e: 'remove'): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isDragging = ref(false)

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const resetState = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  selectedFile.value = null
  previewUrl.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetState()
    }
  },
)

const processFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    toast.error('Invalid file format', {
      description: 'Selected file must be an image (JPG, PNG, WEBP).',
    })
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error('File too large', {
      description: 'Maximum allowed file size is 5 MB.',
    })
    return
  }

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  //toast.success('File attached', { description: file.name })
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

const handleRemove = () => {
  resetState()
  emit('remove')
  toast.info('Attachment removed')
}

const handleSubmit = () => {
  if (selectedFile.value) {
    emit('submit', selectedFile.value)
  }
}

onUnmounted(() => {
  resetState()
})
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <DialogContent
      class="p-7 sm:p-8 rounded-xl bg-background text-foreground shadow-2xl max-w-md [&>button:last-child]:hidden"
    >
      <DialogHeader class="text-left">
        <div class="flex items-center justify-between gap-2">
          <DialogTitle class="text-2xl font-bold font-inter"> Upload Image </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-destructive/10 rounded-lg shrink-0 cursor-pointer"
            @click="emit('update:open', false)"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>

        <DialogDescription class="text-sm text-brand-grey-foreground pt-1">
          {{ description }}
        </DialogDescription>
      </DialogHeader>

      <div class="mt-2 space-y-4">
        <div
          v-if="!selectedFile"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="fileInputRef?.click()"
          :class="[
            'flex flex-col items-center justify-center p-6 sm:p-8 rounded-md border-2 border-dashed transition-all cursor-pointer text-center bg-card/80 hover:bg-card',
            isDragging
              ? 'border-muted-foreground/50 bg-card'
              : 'border-muted hover:border-muted-foreground/50',
          ]"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
          />

          <div class="p-3 rounded-full bg-background border border-muted shadow-xs mb-3">
            <UploadCloud class="h-6 w-6 text-muted-foreground" />
          </div>

          <p class="text-sm font-semibold text-foreground">
            Click to upload <span class="font-normal text-muted-foreground">or drag & drop</span>
          </p>
          <p class="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP (max. 5MB)</p>
        </div>

        <Attachment v-else class="w-full border-muted">
          <AttachmentMedia variant="image" v-if="previewUrl">
            <img :src="previewUrl" :alt="selectedFile.name" class="h-full w-full object-cover" />
          </AttachmentMedia>
          <AttachmentMedia v-else>
            <FileImage
              v-if="selectedFile.type.startsWith('image/')"
              class="h-5 w-5 text-muted-foreground"
            />
            <Paperclip v-else class="h-5 w-5 text-muted-foreground" />
          </AttachmentMedia>

          <AttachmentContent>
            <AttachmentTitle class="font-medium">{{ selectedFile.name }}</AttachmentTitle>
            <AttachmentDescription>{{ formatBytes(selectedFile.size) }}</AttachmentDescription>
          </AttachmentContent>

          <AttachmentActions>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 cursor-pointer"
              @click="handleRemove"
            >
              <Trash2 class="h-4 w-4" />
              <span class="sr-only">Remove file</span>
            </Button>
          </AttachmentActions>
        </Attachment>

        <div class="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            class="rounded-lg text-xs font-inter sm:text-sm cursor-pointer hover:bg-destructive/10"
            @click="emit('update:open', false)"
          >
            Cancel
          </Button>
          <Button
            type="button"
            :disabled="!selectedFile || props.loading"
            @click="handleSubmit"
            class="rounded-lg text-xs font-inter sm:text-sm font-semibold disabled:opacity-50 cursor-pointer"
          >
            {{ props.loading ? 'Saving...' : 'Confirm' }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
