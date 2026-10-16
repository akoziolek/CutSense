  <script setup lang="ts">
  import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from '@/components/ui/carousel'
  import { Card, CardContent } from '@/components/ui/card'

  // TODO decide what we want to display here
  interface Step {
    id: number
  }

  const steps: Step[] = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]

</script>

<template>
  <section class="w-full max-w-6xl mx-auto px-6 sm:px-10 py-18 text-center">
    <div class="max-w-3xl mx-auto mb-12 space-y-4">
      <h2 class="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-inter">
        See how easy it is to get started
      </h2>
      <p class="text-sm sm:text-base text-muted-foreground leading-relaxed">
        There are just few simple steps that you need to follow.
      </p>
    </div>

    <div class="relative w-full max-w-6xl mx-auto px-12 sm:px-16 lg:px-20">
      <Carousel
        :opts="{
          align: 'start',
          loop: false,
        }"
        class="static w-full"
      >
        <CarouselContent class="-ml-4 sm:-ml-6 pl-1 sm:pl-2 pr-1 sm:pr-2">
          <CarouselItem
            v-for="step in steps"
            :key="step.id"
            class="pl-4 sm:pl-6 basis-full sm:basis-1/2 lg:basis-1/3"
          >
            <Card
              class="border-2 border-border rounded-2xl bg-popover shadow-none h-95 sm:h-105 flex flex-col justify-center items-center"
            >
              <CardContent class="p-6">
                <span class="text-2xl font-bold text-muted-foreground/40">
                  Step {{ step.id }}
                </span>
              </CardContent>
            </Card>
          </CarouselItem>
        </CarouselContent>

        <CarouselPrevious
          class="absolute -left-2 sm:-left-6 lg:-left-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-secondary hover:bg-(--secondary)/80 text-foreground border-none shadow-none rounded-full"
        />
        <CarouselNext
          class="absolute -right-2 sm:-right-6 lg:-right-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-secondary hover:bg-(--secondary)/80 text-foreground border-none shadow-none rounded-full"
        />
      </Carousel>
    </div>
  </section>
</template>
