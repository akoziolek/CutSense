<script setup lang="ts">
import { MousePointerClick, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fabricLabel, useOptimizationAddingStore } from '@/stores/addingOptimizationStore'

const emit = defineEmits<{ (e: 'select-group', pieceKeys: string[]): void }>()
const store = useOptimizationAddingStore()
</script>

<template>
  <div class="w-full shrink-0 space-y-3 rounded-md border border-muted bg-card p-4 shadow-xs lg:w-80">
    <h3 class="text-xs font-bold font-inter uppercase tracking-wider text-foreground">
      Fabrics in this run ({{ store.fabricPool.length }})
    </h3>

    <p v-if="!store.fabricPool.length" class="text-xs text-muted-foreground">
      Select pieces and choose a fabric for them.
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="(f, i) in store.fabricPool"
        :key="f.key"
        class="space-y-1.5 rounded-md border border-border/60 p-2 text-xs"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate font-semibold">{{ i + 1 }}. {{ fabricLabel(f) }}</p>
            <Badge variant="secondary" class="mt-1 rounded-md bg-brand-grey font-normal">
              {{ f.source === 'library' ? 'Library' : 'Custom' }}
            </Badge>
          </div>
          <span class="shrink-0 text-muted-foreground">
            {{ store.piecesPerFabric.get(f.key)?.length ?? 0 }} pieces
          </span>
        </div>

        <div class="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            class="h-7 flex-1 gap-1 text-xs"
            @click="emit('select-group', store.piecesPerFabric.get(f.key) ?? [])"
          >
            <MousePointerClick class="h-3.5 w-3.5" /> Select pieces
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            class="h-7 w-7"
            title="Unassign all pieces from this fabric"
            @click="store.assignPieces(store.piecesPerFabric.get(f.key) ?? [], null)"
          >
            <X class="h-4 w-4" />
            <span class="sr-only">Unassign</span>
          </Button>
        </div>
      </li>
    </ul>
  </div>
</template>