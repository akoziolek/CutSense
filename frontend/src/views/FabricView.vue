<script setup lang="ts">
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'

const fabricData = {
  title: 'Small fabric',
  imageSrc: '/path-to-fabric-image.jpg',
  tags: ['Cotton'],
  description:
    'Classic red and white micro-print woven fabric. Crisp, lightweight, and structured, ideal for shirts, summer dresses, and detailed garment assembly.',
}
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-10 sm:py-14 space-y-6">
      <PageHeader :title="fabricData.title">
        <!-- <template #actions>
          Place for favourite, options buttons
        </template> -->
      </PageHeader>

      <main class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <!-- Page content -->
      </main>
    </div>
  </GridLayout>
</template>
