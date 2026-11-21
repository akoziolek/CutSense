<script setup lang="ts">
import type { Component } from 'vue'
import { Ruler, Scissors, SlidersHorizontal, Cpu, FileDown } from 'lucide-vue-next'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Card, CardContent } from '@/components/ui/card'

interface Step {
  id: number
  icon: Component
}

const steps: Step[] = [
  { id: 1, icon: Ruler },
  { id: 2, icon: Scissors },
  { id: 3, icon: SlidersHorizontal },
  { id: 4, icon: Cpu },
  { id: 5, icon: FileDown },
]
</script>

<template>
  <section class="w-full max-w-6xl mx-auto px-6 sm:px-10 py-18 text-center">
    <div class="max-w-3xl mx-auto mb-12 space-y-4">
      <h2 class="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-inter">
        {{ $t('landing.stepsTitle') }}
      </h2>
      <p class="text-sm sm:text-base text-muted-foreground leading-relaxed">
        {{ $t('landing.stepsDescription') }}
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
              class="group border-2 border-muted hover:border-brand-pink transition-colors duration-300 rounded-2xl bg-popover shadow-none h-95 sm:h-105"
            >
              <CardContent class="px-6 pt-5 pb-7 h-full flex flex-col">
                <div class="flex items-center justify-between w-full">
                  <span
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground"
                  >
                    {{ $t('landing.step', { number: step.id }) }}
                  </span>
                  <span class="text-3xl font-bold text-muted-foreground/40 select-none font-inter">
                    0{{ step.id }}
                  </span>
                </div>

                <div class="flex-1 flex items-center justify-center">
                  <component
                    :is="step.icon"
                    class="w-14 h-14 text-foreground/80 group-hover:text-foreground stroke-[1.8] transition-all duration-300 group-hover:-translate-y-1"
                  />
                </div>

                <div class="space-y-2 text-center">
                  <h3
                    class="text-lg sm:text-xl font-bold font-inter text-foreground tracking-tight"
                  >
                    {{ $t(`landing.steps.${step.id}.title`) }}
                  </h3>
                  <p class="text-sm text-muted-foreground leading-relaxed min-h-[4.5rem]">
                    {{ $t(`landing.steps.${step.id}.description`) }}
                  </p>
                </div>
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
