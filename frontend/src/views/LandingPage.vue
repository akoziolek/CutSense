<script setup lang="ts">
  import GridBackgroundLayout from '@/components/common/GridBackgroundLayout.vue';
  import BannerTicker from '@/components/common/BannerTicker.vue';
  import StepsCarouselSection from '@/components/landing/StepsCarouselSection.vue';
</script>

<template>
  <GridBackgroundLayout>
    <template #header> </template>
    <BannerTicker/>
    <StepsCarouselSection/>
  </GridBackgroundLayout>
</template>
