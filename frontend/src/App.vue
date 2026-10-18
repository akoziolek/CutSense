<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
</script>

<template>
  <AuthModal />
  <Toaster
    position="top-right"
    :toast-options="{
      classes: {
        toast: 'bg-background text-foreground shadow-lg rounded-md',
        description: 'text-muted-foreground text-xs',
        actionButton: 'bg-primary text-primary-foreground',
        cancelButton: 'bg-muted text-muted-foreground',
        error: '!text-destructive',
        success: '!text-emerald-600',
        info: '!text-blue-600',
        warning: '!text-amber-600',
      },
    }"
  />
  <main>
    <RouterView />
  </main>
</template>
