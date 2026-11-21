<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import AuthModal from './components/auth/AuthModal.vue'
import { useAuth } from '@/stores/authStore.ts'

const route = useRoute()
const router = useRouter()
const { state } = useAuth()

watch(
  () => state.user,
  (user, previous) => {
    if (previous && !user && !route.meta.isPublic) {
      void router.replace({ name: 'Landing' })
    }
  },
)
</script>

<template>
  <!-- TODO - why is the auth backdrop so dark? -->
  <AuthModal />
  <Toaster
    position="bottom-center"
    :offset="{bottom: '40px'}"
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
