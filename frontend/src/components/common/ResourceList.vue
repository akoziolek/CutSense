<script setup lang="ts">
import { SearchX } from 'lucide-vue-next'
import ErrorState from '@/components/common/ErrorState.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

defineProps<{
  noun: string
  total: number | null
  loading: boolean
  error: string
  hasCriteria: boolean
  pageSize: number
  plain?: boolean
}>()
const emit = defineEmits<{ (e: 'retry'): void; (e: 'reset'): void }>()

const gridClass = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
</script>

<template>
  <Transition
    mode="out-in"
    enter-active-class="transition-opacity duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <!-- loading -->
    <div v-if="loading" key="skeleton" :class="plain ? 'space-y-2' : gridClass">
      <template v-if="plain">
        <Skeleton v-for="n in 8" :key="n" class="h-10 w-full" />
      </template>
      <template v-else>
        <div v-for="n in pageSize" :key="n" class="space-y-3">
          <Skeleton class="aspect-square w-full rounded-md" />
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-3 w-1/2" />
        </div>
      </template>
    </div>

    <!-- error -->
    <div v-else-if="error" key="error">
      <ErrorState
        :title="`Unable to load ${noun}`"
        :message="error"
        code="Error"
        retry-label="Try again"
        back-label="Back to home"
        back-to="/"
        @retry="emit('retry')"
      />
    </div>

    <!-- search or filters match nothing -->
    <div
      v-else-if="total === 0 && hasCriteria"
      key="no-match"
      class="flex flex-col items-center justify-center gap-2 py-20 text-center"
    >
      <SearchX class="size-8 text-muted-foreground" />
      <p class="max-w-xs text-xs text-muted-foreground">
        We couldn't find any {{ noun }} matching your criteria.
      </p>
      <Button variant="outline" size="sm" class="mt-2 rounded-lg" @click="emit('reset')">
        Clear filters
      </Button>
    </div>

    <!-- nothing exists yet -->
    <div
      v-else-if="total === 0"
      key="empty"
      class="flex flex-col items-center justify-center gap-2 py-20 text-center"
    >
      <slot name="empty" />
    </div>

    <!-- list -->
    <div v-else-if="total !== null" key="list" class="space-y-10">
      <div :class="plain ? '' : gridClass"><slot /></div>
      <slot name="footer" />
    </div>
  </Transition>
</template>