<script setup lang="ts">
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

defineProps<{ total: number; itemsPerPage: number }>()
const page = defineModel<number>('page', { required: true })
</script>

<template>
  <Pagination
    v-slot="{ page: currentPage }"
    :total="total"
    :items-per-page="itemsPerPage"
    :sibling-count="1"
    :page="page"
    show-edges
    @update:page="page = $event"
  >
    <PaginationContent v-slot="{ items }">
      <PaginationPrevious />
      <template v-for="(item, index) in items" :key="index">
        <PaginationItem
          v-if="item.type === 'page'"
          :value="item.value"
          :is-active="item.value === currentPage"
        >
          {{ item.value }}
        </PaginationItem>
        <PaginationEllipsis v-else :index="index" />
      </template>
      <PaginationNext />
    </PaginationContent>
  </Pagination>
</template>