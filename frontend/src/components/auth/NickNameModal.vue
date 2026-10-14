<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, CheckCircle2, AlertCircle, Sparkles, Circle } from 'lucide-vue-next'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'

// Przykładowy prop do sterowania widocznością i imieniem użytkownika???
const props = withDefaults(
  defineProps<{
    open?: boolean
    userName?: string
  }>(),
  {
    open: true,
    userName: 'Aleksandra',
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', nickname: string): void
}>()

const nickname = ref('')

// TODO - replace with backend service for generating VALID nicknames
const status = computed<'idle' | 'available' | 'taken'>(() => {
  return 'idle'
})

const generateRandomNickname = () => {
  nickname.value = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: '_',
    style: 'capital',
  })
}

const handleSave = () => {
  if (status.value === 'available') {
    emit('save', nickname.value)
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent
      @pointer-down-outside.prevent
      @escape-key-down.prevent
      class="... [&>button]:hidden p-7 sm:p-8 rounded-mm bg-background text-foreground shadow-2xl"
    >
      <DialogHeader class="text-left">
        <DialogTitle class="text-2xl sm:text-3xl font-bold font-inter tracking-tight">
          Welcome, <span class="italic">{{ props.userName }}</span
          >!
        </DialogTitle>
        <DialogDescription class="text-xs sm:text-sm text-brand-grey-foreground font-normal">
          Choose a unique nickname to get started.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2 mt-2">
        <div class="relative flex items-center">
          <div class="absolute left-3.5 flex items-center pointer-events-none">
            <Circle
              v-if="status === 'idle'"
              class="w-4 h-4 sm:w-5 sm:h-5 text-input fill-muted"
            />

            <CheckCircle2
              v-else-if="status === 'available'"
              class="w-4 h-4 sm:w-5 sm:h-5 text-brand-green-foreground fill-brand-green stroke-[2.2]"
            />

            <AlertCircle
              v-else-if="status === 'taken'"
              class="w-4 h-4 sm:w-5 sm:h-5 text-destructive stroke-[2.2]"
            />
          </div>

          <Input
            v-model="nickname"
            type="text"
            placeholder="e.g. alex_k"
            :class="[
              'h-11 pl-10 pr-10 text-sm font-medium rounded-xl border transition-colors focus-visible:ring-1 focus-visible:ring-offset-0',
              status === 'taken'
                ? 'border-destructive/80 text-foreground focus-visible:border-destructive focus-visible:ring-destructive'
                : status === 'available'
                  ? 'border-brand-green-foreground/80 focus-visible:border-brand-green-foreground focus-visible:ring-brand-green-foreground'
                  : 'border-border/80 placeholder:text-input focus-visible:border-border focus-visible:ring-border',
            ]"
          />

          <button
            type="button"
            @click="generateRandomNickname"
            title="Generate nickname"
            class="absolute right-3 p-2 rounded-md text-input hover:text-border hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <Sparkles class="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <p v-if="status === 'taken'" class="text-xs font-semibold text-destructive text-left pl-1">
          This nickname is already taken.
        </p>
      </div>

      <div class="mt-2 flex justify-end">
        <Button
          type="button"
          :disabled="status !== 'available'"
          @click="handleSave"
          class="h-9 w-24 rounded-lg text-xs sm:text-sm font-semibold font-inter inline-flex items-center gap-1.5 transition-all bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed shadow-sm"
        >
          <span>Save</span>
          <Check class="w-3.5 h-3.5 stroke-[2.5]" />
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
