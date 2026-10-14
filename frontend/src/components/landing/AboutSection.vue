<script setup lang="ts"></script>

<template>
  <section class="w-full max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-18 items-center">
      <div class="flex flex-col">
        <!-- TODO - what text do we want -->
        <h2
          class="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-inter leading-tight mb-8"
        >
          Smart fabric nesting made simple
        </h2>

        <p class="text-sm sm:text-base text-muted-foreground leading-relaxed text-justify">
          Traditional pattern layouts often lead to unnecessary fabric waste, and hours of manual
          shifting CutSense takes the guesswork out of preparation by using intelligent nesting
          algorithms built specifically for digital sewing patterns. Simply upload your pattern
          pieces, set the roll width, grainline rules, and required margins, and the system
          instantly computes the densest possible layout across every meter of fabric. By automating
          the planning phase, you reduce preparation time from hours to seconds while keeping raw
          material expenses under strict control.
        </p>
      </div>

      <div class="flex justify-center lg:justify-end">
        <div class="relative w-full max-w-md lg:max-w-none rounded-sm p-4 bg-brand-violet shadow-lg">
          <div class="rounded-sm overflow-hidden">
            <!-- TODO - find a better image -->
            <img
              src="@/assets/images/pattern-preview.png"
              alt="Pattern preview"
              class="w-full h-auto object-cover select-none"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
