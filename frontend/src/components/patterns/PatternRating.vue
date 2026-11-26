<script setup lang="ts">
import { computed, ref } from 'vue'
import { Star } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import RatingStars from '@/components/patterns/RatingStars.vue'
import { usePatternRating } from '@/composables/patterns/usePatternRating'
import type { PatternRatingState } from '@/types/pattern'
import { useI18n } from 'vue-i18n'

const STARS = [1, 2, 3, 4, 5]
const { t } = useI18n()

const props = defineProps<{
  patternId: number
  userRating: number | null
  starCount: number
  starAverage: string
  isLoggedIn: boolean
  isOwner: boolean
}>()

const emit = defineEmits<{ (e: 'rated', state: PatternRatingState): void }>()

const open = ref(false)
const hovered = ref<number | null>(null)
const { pending, rate: saveRating, signIn: handleSignIn } = usePatternRating()

const shown = computed(() => hovered.value ?? props.userRating ?? 0)
const average = computed(() => Number(props.starAverage))
const averageLabel = computed(() => `(${average.value.toFixed(2)})`)

const rate = async (value: number) => {
  const result = await saveRating(props.patternId, value, props.userRating)
  if (result) {
    emit('rated', result)
    open.value = false
  }
}
</script>

<template>
  <div
    v-if="isOwner"
    class="ml-4 inline-flex items-center align-middle gap-2"
    :title="`${starCount} ratings`"
  >
    <RatingStars :value="average" />
    <span class="text-sm text-muted-foreground">{{ averageLabel }}</span>
  </div>

  <Popover v-else v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="ml-4 inline-flex cursor-pointer items-center align-middle gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :aria-label="isLoggedIn ? 'Rate this pattern' : 'Ratings'"
      >
        <RatingStars :value="average" />
        <span class="text-sm text-muted-foreground">{{ averageLabel }}</span>
      </button>
    </PopoverTrigger>

    <PopoverContent align="start" :side-offset="8" class="w-64 space-y-3">
      <p class="text-xs text-muted-foreground">
        {{ starCount }} {{ starCount === 1 ? 'rating' : 'ratings' }}
      </p>

      <template v-if="isLoggedIn">
        <p class="text-sm font-semibold font-inter">
          {{ userRating ? 'Your rating' : 'Rate this pattern' }}
        </p>
        <div
          role="radiogroup"
          aria-label="Your rating"
          class="flex items-center gap-1"
          @mouseleave="hovered = null"
        >
          <button
            v-for="star in STARS"
            :key="star"
            type="button"
            role="radio"
            :aria-checked="userRating === star"
            :aria-label="`${star} ${star === 1 ? 'star' : 'stars'}`"
            :disabled="pending"
            class="cursor-pointer rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            @mouseenter="hovered = star"
            @focus="hovered = star"
            @blur="hovered = null"
            @click="rate(star)"
          >
            <Star
              class="size-7 text-foreground transition-colors"
              :class="star <= shown ? 'fill-foreground' : ''"
            />
          </button>
        </div>
      </template>

      <Button v-else variant="outline" size="sm" class="w-full rounded-lg" @click="handleSignIn">
        {{ t('signInToRate') }}
      </Button>
    </PopoverContent>
  </Popover>
</template>