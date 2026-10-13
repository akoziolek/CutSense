<script setup lang="ts">
import GridBackgroundLayout from '@/components/common/GridBackgroundLayout.vue'
import BannerTicker from '@/components/common/BannerTicker.vue'
import StepsCarouselSection from '@/components/landing/StepsCarouselSection.vue'
import Separator from '@/components/ui/separator/Separator.vue'
import AboutSection from '@/components/landing/AboutSection.vue'
import CreatorsSection from '@/components/landing/CreatorsSection.vue'
import CtaSection from '@/components/landing/CtaSection.vue'
</script>

<template>
  <GridBackgroundLayout>
    <template #header>
      <CtaSection />
    </template>
    <BannerTicker />
    <StepsCarouselSection />
    <Separator
      class="w-full h-0.5 bg-transparent bg-[repeating-linear-gradient(to_right,var(--border)_0px,var(--border)_16px,transparent_16px,transparent_32px)] border-none"
    />
    <AboutSection />
    <template #footer>
      <CreatorsSection />
      <div class="w-full bg-brand-violet py-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)] mt-8" />
    </template>
  </GridBackgroundLayout>
</template>
