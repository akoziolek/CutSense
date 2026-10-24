<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EllipsisVertical, Pencil } from 'lucide-vue-next'
import Button from '../ui/button/Button.vue'
import { ref } from 'vue'
import { type RouteLocationRaw } from 'vue-router'

interface Props {
  editTo: RouteLocationRaw
}

defineProps<Props>()

const isMenuOpen = ref(false)
</script>

<template>
  <DropdownMenu :modal="false" v-model:open="isMenuOpen">
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="h-9 w-9 border-2 hover:bg-brand-pink"
        aria-label="Actions menu"
      >
        <EllipsisVertical class="w-5 h-5" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      :align="'end'"
      :side-offset="12"
      class="hidden lg:block w-48 border-2 p-0 overflow-hidden"
    >
      <DropdownMenuItem
        as-child
        class="cursor-pointer rounded-none px-4 py-2.5 focus:bg-brand-green"
      >
        <RouterLink :to="editTo">
          <Pencil class="w-4 h-4 mr-2" />
          Edit
        </RouterLink>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
