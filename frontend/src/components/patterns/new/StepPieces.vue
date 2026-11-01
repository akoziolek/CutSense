<script setup lang="ts">
import { onMounted } from 'vue'
import { Trash2, Copy } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PatternPiecePreview from './PatternPiecePreview.vue'
import SidebarThreadDirection from '@/components/spatial/sidebar/SidebarThreadDirection.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import { usePatternAddingStore } from '@/stores/addingPatternStore'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const patternStore = usePatternAddingStore()

onMounted(() => {
  patternStore.syncPiecesFromConfigs()
})

const getPiecePoints = (photoIndex: number, shapeIndex: number) => {
  return patternStore.photoConfigs[photoIndex]?.shapes[shapeIndex] || []
}

const getPhotoRotation = (photoIndex: number) => {
  return patternStore.photoConfigs[photoIndex]?.rotation || 0
}

const updateQuantity = (pieceId: string, field: 'normal' | 'mirrored', rawVal: string | number) => {
  const num = typeof rawVal === 'number' ? rawVal : parseInt(String(rawVal), 10)
  if (isNaN(num)) return
  const clamped = Math.min(99, Math.max(0, num))
  patternStore.updatePiece(pieceId, { [field]: clamped })
}
</script>

<template>
  <div
    class="w-full max-w-3xl xl:max-w-4xl ml-0 md:ml-14 pr-4 md:pr-14 space-y-4 pb-8 text-left font-inter"
  >
    <div v-if="patternStore.pieces.length > 0" class="space-y-4">
      <article
        v-for="(piece, index) in patternStore.pieces"
        :key="piece.id"
        class="flex flex-col xl:flex-row items-center xl:items-start gap-5 p-4 sm:p-5 border border-muted rounded-md shadow-xs bg-card hover:shadow-md transition-all overflow-hidden"
      >
        <PatternPiecePreview
          :image-url="patternStore.previewUrls[piece.photoIndex]"
          :points="getPiecePoints(piece.photoIndex, piece.shapeIndex)"
          :shape-index="piece.shapeIndex"
          :rotation="getPhotoRotation(piece.photoIndex)"
          :all-shapes="patternStore.photoConfigs[piece.photoIndex]?.shapes"
        />

        <div class="w-full flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div class="flex items-center justify-between gap-4 border-b border-border/60 pb-2 mb-4">
            <h2
              class="font-inter text-xl font-bold tracking-tight text-foreground select-none truncate"
            >
              {{ piece.name || `Piece #${index + 1}` }}
            </h2>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              class="h-8 w-8 rounded-lg transition-colors cursor-pointer text-destructive bg-destructive/15 hover:bg-destructive/20 hover:text-destructive shrink-0"
              title="Delete piece"
              @click="patternStore.removePieceById(piece.id)"
            >
              <Trash2 class="h-4 w-4" />
              <span class="sr-only">Delete piece</span>
            </Button>
          </div>

          <div class="flex flex-col md:flex-row xl:items-center gap-4 xl:gap-8">
            <div class="space-y-2 shrink-0">
              <div class="flex items-center gap-2">
                <Copy class="h-4 w-4 text-foreground" />
                <h3 class="text-xs font-bold font-inter text-foreground uppercase tracking-wider">
                  Number of pieces
                </h3>
              </div>

              <div class="flex items-center gap-3 sm:gap-4 text-xs pt-0.5">
                <label class="flex items-center gap-2 font-medium">
                  <span class="text-muted-foreground">Normal:</span>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    :model-value="piece.normal"
                    class="w-14 h-8 text-xs font-mono font-semibold text-center bg-background border border-border focus-visible:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    @input="
                      (e: Event) => {
                        const target = e.target as HTMLInputElement
                        const sanitized = target.value.replace(/[^0-9]/g, '')
                        target.value = sanitized
                        updateQuantity(piece.id, 'normal', sanitized)
                      }
                    "
                    @blur="
                      (e: Event) => {
                        const target = e.target as HTMLInputElement
                        if (target.value === '') {
                          updateQuantity(piece.id, 'normal', 0)
                          target.value = String(piece.normal)
                        }
                      }
                    "
                  />
                </label>

                <label class="flex items-center gap-2 font-medium">
                  <span class="text-muted-foreground">Mirrored:</span>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    :model-value="piece.mirrored"
                    class="w-14 h-8 text-xs font-mono font-semibold text-center bg-background border border-border focus-visible:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    @input="
                      (e: Event) => {
                        const target = e.target as HTMLInputElement
                        const sanitized = target.value.replace(/[^0-9]/g, '')
                        target.value = sanitized
                        updateQuantity(piece.id, 'mirrored', sanitized)
                      }
                    "
                    @blur="
                      (e: Event) => {
                        const target = e.target as HTMLInputElement
                        if (target.value === '') {
                          updateQuantity(piece.id, 'mirrored', 0)
                          target.value = String(piece.mirrored)
                        }
                      }
                    "
                  />
                </label>
              </div>
            </div>

            <div class="hidden xl:block w-px h-10 bg-border/60 self-center shrink-0" />

            <div
              class="w-full max-w-[260px] shrink-0 [&_div.bg-card]:p-0 [&_div.bg-card]:border-none [&_div.bg-card]:shadow-none [&_div.border-b]:border-b-0 [&_div.border-b]:mb-2"
            >
              <SidebarThreadDirection
                :thread-angle="piece.grainline"
                @update:thread-angle="
                  (val: number) => patternStore.updatePiece(piece.id, { grainline: val })
                "
              />
            </div>
          </div>
        </div>
      </article>
    </div>

    <div
      v-else
      class="rounded-xl border border-dashed border-border p-8 text-left text-xs text-muted-foreground bg-card/40 space-y-1"
    >
      <p class="font-inter font-semibold text-sm text-foreground">No pattern pieces detected.</p>
      <p>Go back to Step 2 to ensure pattern boundaries are properly configured on your photos.</p>
    </div>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Next step"
      :disabled="patternStore.pieces.length === 0"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>