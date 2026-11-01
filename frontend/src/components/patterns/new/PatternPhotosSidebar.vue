<script setup lang="ts">
import { ref, watch } from 'vue'
import { Eye, EyeOff, Loader2, PanelLeftClose, PanelLeftOpen, Images } from 'lucide-vue-next'
import type { PatternPhotoData } from '@/stores/addingPatternStore'

const props = defineProps<{
  previewUrls: string[]
  photos: File[]
  photoConfigs: PatternPhotoData[]
  activePhotoIndex: number
  activeShapeIndex: number
}>()

const emit = defineEmits<{
  (e: 'selectPhotoAndShape', photoIdx: number, shapeIdx: number): void
  (e: 'toggleVisibility', photoIdx: number, shapeIdx: number): void
  (e: 'hoverShape', shapeIdx: number | null): void
}>()

const isCollapsed = ref(false)
const expandedPhotoIndex = ref<number | null>(props.activePhotoIndex)

watch(
  () => props.activePhotoIndex,
  (newActiveIdx) => {
    expandedPhotoIndex.value = newActiveIdx
  },
)

const handlePhotoHeaderClick = (photoIdx: number) => {
  expandedPhotoIndex.value = photoIdx
  emit('selectPhotoAndShape', photoIdx, 0)
}
</script>

<template>
  <aside
    class="shrink-0 flex flex-col w-full h-auto lg:h-[520px] bg-card border border-muted rounded-md p-3 shadow-xs transition-all duration-200 select-none overflow-hidden"
    :class="[isCollapsed ? 'lg:w-16 lg:items-center lg:p-2' : 'lg:w-60']"
  >
    <div
      class="w-full flex items-center pb-2.5 mb-2 border-b border-border/60 shrink-0 justify-between"
      :class="[isCollapsed ? 'lg:justify-center lg:border-b-0 lg:pb-0 lg:mb-2' : 'px-0.5']"
    >
      <div class="flex items-center gap-2 min-w-0" :class="isCollapsed ? 'flex lg:hidden' : 'flex'">
        <Images class="h-4 w-4 shrink-0" />
        <h3 class="text-xs font-bold font-inter text-foreground uppercase tracking-wider truncate">
          Photos & Pieces
        </h3>
      </div>

      <button
        type="button"
        class="hidden lg:flex p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
        :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="isCollapsed = !isCollapsed"
      >
        <PanelLeftOpen v-if="isCollapsed" class="h-4 w-4" />
        <PanelLeftClose v-else class="h-4 w-4" />
      </button>
    </div>

    <div class="w-full flex-1 min-h-0 space-y-2.5 overflow-y-auto scrollbar-thin p-1">
      <div
        v-for="(url, photoIdx) in props.previewUrls"
        :key="photoIdx"
        class="transition-all duration-200"
        :class="[
          isCollapsed
            ? 'lg:bg-transparent lg:p-0 lg:flex lg:justify-center'
            : props.activePhotoIndex === photoIdx
              ? 'rounded-lg border border-brand-violet bg-brand-violet/40 shadow-md shadow-violet-500/20 overflow-hidden'
              : 'rounded-lg border border-border/30 bg-muted/20 hover:bg-muted/40 hover:border-violet-400/40 hover:shadow-violet-500/15 overflow-hidden',
        ]"
      >
        <div v-if="isCollapsed" class="hidden lg:flex p-0.5 items-center justify-center">
          <button
            type="button"
            class="relative w-10 h-10 size-10 aspect-square shrink-0 rounded-lg cursor-pointer transition-all duration-200 block"
            :class="[
              props.activePhotoIndex === photoIdx
                ? 'p-[2px] bg-violet-600 shadow-md shadow-violet-500/30 scale-105'
                : 'p-[1px] bg-border/60 opacity-75 hover:opacity-100 hover:bg-violet-400 hover:scale-105',
            ]"
            :title="`Photo #${photoIdx + 1}`"
            @click="handlePhotoHeaderClick(photoIdx)"
          >
            <img
              :src="url"
              :alt="props.photos[photoIdx]?.name"
              class="w-full h-full object-cover block rounded-[6px]"
            />

            <div
              v-if="props.photoConfigs[photoIdx]?.isAnalyzing"
              class="absolute inset-[2px] bg-black/40 flex items-center justify-center rounded-[6px]"
            >
              <Loader2 class="w-3.5 h-3.5 animate-spin text-white" />
            </div>
          </button>
        </div>

        <div :class="isCollapsed ? 'block lg:hidden' : 'block'" class="p-2">
          <div
            class="flex items-center justify-between gap-2 p-1 rounded-md cursor-pointer transition-colors"
            @click="handlePhotoHeaderClick(photoIdx)"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="w-7 h-7 size-7 shrink-0 aspect-square rounded-md overflow-hidden bg-muted border border-border/40 shadow-2xs"
              >
                <img
                  :src="url"
                  :alt="props.photos[photoIdx]?.name"
                  class="w-full h-full object-cover aspect-square"
                />
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-xs font-inter font-semibold text-foreground truncate">
                  Photo #{{ photoIdx + 1 }}
                </p>
                <p class="text-[10px] font-mono text-muted-foreground">
                  {{ props.photoConfigs[photoIdx]?.shapes?.length || 0 }} pcs
                </p>
              </div>
            </div>

            <div v-if="props.photoConfigs[photoIdx]?.isAnalyzing" class="shrink-0 ml-1">
              <Loader2 class="w-3.5 h-3.5 animate-spin text-violet-600" />
            </div>
          </div>

          <div
            v-if="expandedPhotoIndex === photoIdx && props.photoConfigs[photoIdx]?.shapes?.length"
            class="mt-1.5 pt-1.5 border-t border-border/30 space-y-0.5"
          >
            <div
              v-for="(_, shapeIdx) in props.photoConfigs[photoIdx]?.shapes || []"
              :key="shapeIdx"
              class="group flex items-center justify-between px-2 py-1 rounded-md text-xs font-inter transition-all cursor-pointer"
              :class="
                props.activePhotoIndex === photoIdx && props.activeShapeIndex === shapeIdx
                  ? 'bg-violet-600 text-white font-semibold shadow-2xs'
                  : 'hover:bg-violet-500/10 text-muted-foreground hover:text-violet-700'
              "
              @click="emit('selectPhotoAndShape', photoIdx, shapeIdx)"
              @mouseenter="emit('hoverShape', shapeIdx)"
              @mouseleave="emit('hoverShape', null)"
            >
              <span class="truncate">Piece {{ shapeIdx + 1 }}</span>

              <button
                type="button"
                class="p-1 rounded-md transition-colors cursor-pointer"
                :class="
                  props.activePhotoIndex === photoIdx && props.activeShapeIndex === shapeIdx
                    ? 'hover:bg-white/20 text-white'
                    : 'hover:bg-black/10 text-muted-foreground hover:text-foreground'
                "
                :title="
                  props.photoConfigs[photoIdx]?.hiddenShapes?.[shapeIdx]
                    ? 'Show length labels for this piece'
                    : 'Hide length labels for this piece'
                "
                @click.stop="emit('toggleVisibility', photoIdx, shapeIdx)"
              >
                <EyeOff
                  v-if="props.photoConfigs[photoIdx]?.hiddenShapes?.[shapeIdx]"
                  class="w-3.5 h-3.5 opacity-60"
                />
                <Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
