<script setup lang="ts">
import { Button } from '@/components/ui/button'
import TextHighlight from '../common/TextHighlight.vue'
</script>

<template>
  <section
    class="relative w-full py-24 px-4 sm:px-10 flex flex-col items-center justify-center text-center overflow-hidden"
  >
    <div class="relative max-w-6xl mx-auto flex flex-col items-center">
      
      <div class="my-3">
        <TextHighlight class="text-5xl sm:text-6xl lg:text-8xl">
          <span class="relative inline-block w-0 h-0">
            <img
              src="@/assets/images/safety-pin.png"
              alt="Safety pin"
              class="absolute bottom-0 right-0 w-7 h-7 sm:w-11 sm:h-11 lg:w-13 lg:h-13 max-w-none pointer-events-none select-none z-10 -rotate-12 translate-x-1 sm:translate-x-2 translate-y-[5%] sm:translate-y-[-25%]"
            />
          </span>

          Every centimeter counts

          <span class="relative inline-block w-0 h-0 align-baseline">
            <img
              src="@/assets/images/safety-pin.png"
              alt="Safety pin"
              class="absolute top-0 left-0 w-7 h-7 sm:w-11 sm:h-11 lg:w-13 lg:h-13 max-w-none pointer-events-none select-none z-10 rotate-5 -translate-x-1 sm:-translate-x-2 -translate-y-[15%] sm:-translate-y-[40%]"
            />
          </span>
        </TextHighlight>
      </div>

      <div class="inline-flex items-center justify-center mt-2">
        <h3
          class="text-3xl sm:text-5xl lg:text-7xl uppercase text-foreground font-staatliches"
        >
          Sew with less waste
        </h3>
      </div>

      <div class="inline-block mt-2">
        <h3
          class="text-3xl sm:text-5xl lg:text-7xl uppercase text-foreground font-staatliches"
        >
          And create more
        </h3>
      </div>
    </div>

    <div class="mt-8 sm:mt-12">
      <div class="relative group inline-block">
        <Button
          variant="outline"
          class="h-auto bg-background text-foreground border-2 border-border 
                 shadow-[3px_3px_0px_0px_rgba(24,24,27,1)] sm:shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] 
                 px-5 py-2 sm:px-8 sm:py-2 
                 text-sm sm:text-base font-bold 
                 hover:bg-pink-100 hover:-translate-x-1 hover:-translate-y-1 
                 active:translate-x-0 active:translate-y-0 
                 transition-all duration-200 ease-out rounded-lg"
        >
          Get started
        </Button>
      </div>
    </div>
  </section>
</template>