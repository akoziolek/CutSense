<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const props = defineProps<{ open: boolean; error?: string; registrationCancelled?: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'login'): void }>()
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="p-7 sm:p-8 rounded-xl bg-background text-foreground shadow-2xl">
      <DialogHeader class="text-left">
        <DialogTitle class="text-2xl font-bold font-inter">
          {{ props.registrationCancelled ? 'Registration cancelled' : 'Sign in to continue' }}
        </DialogTitle>
        <DialogDescription class="text-sm text-brand-grey-foreground">
          {{
            props.registrationCancelled
              ? 'Your account was not created. You can continue browsing or sign in with Google to try again.'
              : 'This page is available only for signed-in users.'
          }}
        </DialogDescription>
      </DialogHeader>
      <p v-if="error" class="text-sm font-semibold text-destructive" role="alert">{{ error }}</p>
      <Button class="mt-2" @click="emit('login')">Continue with Google</Button>
    </DialogContent>
  </Dialog>
</template>