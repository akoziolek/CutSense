<script setup lang="ts">
import GridBackgroundLayout from '@/components/common/GridBackgroundLayout.vue'
import BannerTicker from '@/components/common/BannerTicker.vue'
import StepsCarouselSection from '@/components/landing/StepsCarouselSection.vue'
import Separator from '@/components/ui/separator/Separator.vue'
</script>

<template>
  <GridBackgroundLayout>
    <template #header> </template>
    <BannerTicker />
    <StepsCarouselSection />
    <Separator
      class="w-full h-0.5 bg-transparent bg-[repeating-linear-gradient(to_right,var(--border)_0px,var(--border)_16px,transparent_16px,transparent_32px)] border-none"
    />
  </GridBackgroundLayout>
</template>
