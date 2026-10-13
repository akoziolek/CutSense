<script setup lang="ts">
import Autoplay from 'embla-carousel-autoplay'
import TextHighlight from '@/components/common/TextHighlight.vue'
import CreatorCard from './CreatorCard.vue'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel'

interface Creator {
  id: string
  firstName: string
  lastName: string
  description: string
  //avatar?: string
}

const creators: Creator[] = [
  {
    id: '1',
    firstName: 'Aleksandra',
    lastName: 'Kozioł',
    description: 'Some description about us.',
  },
  {
    id: '2',
    firstName: 'Maja',
    lastName: 'Kurczyna',
    description: 'Some description about us.',
  },
  {
    id: '3',
    firstName: 'Anna',
    lastName: 'Wędrychowicz',
    description: 'Some description about us.',
  },
]

// doubled for carousel loop to work
const mobileLoopedCreators = [
  ...creators.map((c) => ({ ...c, uniqueKey: `a-${c.id}` })),
  ...creators.map((c) => ({ ...c, uniqueKey: `b-${c.id}` })),
]

const autoplayPlugin = Autoplay({
  delay: 3200,
  stopOnInteraction: false,
})
</script>

<template>
  <section class="w-full max-w-6xl mx-auto px-6 sm:px-10 py-18 text-center">
    <div class="max-w-3xl mx-auto mb-12 space-y-4">
      <h2 class="text-3xl sm:text-4xl lg:text-5xl">
        <TextHighlight color="var(--accent)"> Creators </TextHighlight>
      </h2>
    </div>

    <!-- autoplay carousel for mobile / smaller screens -->
    <div class="block lg:hidden relative w-full max-w-6xl mx-auto px-12 sm:px-16">
      <Carousel
        :plugins="[autoplayPlugin]"
        :opts="{ align: 'start', loop: true}"
        class="static w-full"
      >
        <CarouselContent class="-ml-4 sm:-ml-6 pl-1 sm:pl-2 pr-1 sm:pr-2">
          <CarouselItem
            v-for="creator in mobileLoopedCreators"
            :key="creator.uniqueKey"
            class="pl-4 sm:pl-6 basis-full sm:basis-1/2 flex justify-center"
          >
            <CreatorCard :creator="creator" />
          </CarouselItem>
        </CarouselContent>

        <CarouselPrevious
          class="absolute -left-2 sm:-left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-secondary hover:bg-secondary/80 text-foreground border-none shadow-none rounded-full"
        />
        <CarouselNext
          class="absolute -right-2 sm:-right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-secondary hover:bg-secondary/80 text-foreground border-none shadow-none rounded-full"
        />
      </Carousel>
    </div>

    <!-- Desktop view - without carousel -->
    <div class="hidden lg:grid grid-cols-3 gap-8 max-w-5xl mx-auto w-full">
      <CreatorCard v-for="creator in creators" :key="creator.id" :creator="creator" />
    </div>
  </section>
</template>
