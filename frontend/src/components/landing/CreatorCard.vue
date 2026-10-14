<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'

defineProps<{
  creator: {
    firstName: string
    lastName: string
    description: string
  }
}>()
</script>

<template>
  <Card
    class="w-full max-w-[320px] lg:max-w-none border-2 border-bg-primary bg-white rounded-2xl shadow-none p-8 flex flex-col items-center text-center justify-between min-h-[380px]"
  >
    <CardContent class="p-0 flex flex-col items-center">
      <div
        class="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-brand-grey overflow-hidden my-6 flex items-center justify-center shrink-0"
      >
        <!-- TODO insert our pics? -->
      </div>

      <h3 class="text-xl sm:text-2xl font-bold leading-snug">
        {{ creator.firstName }}<br />
        {{ creator.lastName }}
      </h3>

      <p class="text-xs sm:text-sm text-foreground font-normal mt-3">
        {{ creator.description }}
      </p>
    </CardContent>
  </Card>
</template>
