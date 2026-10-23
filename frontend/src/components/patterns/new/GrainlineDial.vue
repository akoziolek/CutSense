<script setup lang="ts">
const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>()

const ticks = Array.from({ length: 36 }, (_, i) => i * 10)

function setFromEvent(e: PointerEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const dx = e.clientX - (rect.left + rect.width / 2)
  const dy = e.clientY - (rect.top + rect.height / 2)
  const deg = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI)
  emit('update:modelValue', (deg + 360) % 360)
}

function onDown(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  setFromEvent(e)
}

function onMove(e: PointerEvent) {
  if (e.buttons === 1) setFromEvent(e)
}
</script>

<template>
  <div
    class="relative h-28 w-28 shrink-0 cursor-pointer touch-none select-none"
    role="slider"
    aria-label="Grainline angle"
    aria-valuemin="0"
    aria-valuemax="359"
    :aria-valuenow="props.modelValue"
    @pointerdown="onDown"
    @pointermove="onMove"
  >
    <svg viewBox="0 0 100 100" class="absolute inset-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)]">
      <line
        v-for="t in ticks"
        :key="t"
        x1="50"
        y1="2"
        x2="50"
        :y2="t % 90 === 0 ? 11 : 7"
        class="stroke-foreground"
        stroke-width="1"
        :transform="`rotate(${t} 50 50)`"
      />
      <circle cx="50" cy="50" r="36" class="fill-zinc-300 stroke-foreground" stroke-width="1.5" />
      <g :transform="`rotate(${props.modelValue} 50 50)`">
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="26"
          class="stroke-foreground"
          stroke-width="3"
          stroke-linecap="round"
        />
        <polygon points="50,16 41,31 59,31" class="fill-foreground" />
      </g>
    </svg>
    <span class="absolute left-1/2 top-0 -translate-x-1/2 text-[9px] text-muted-foreground">0°</span>
    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">90°</span>
    <span class="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground">180°</span>
    <span class="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">270°</span>
  </div>
</template>