<script setup lang="ts">
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ImagePreview from '@/components/common/ImagePreview.vue'
import sampleFabricImg from '@/assets/images/sample_fabric.jpg'
import DetailsCard from '@/components/common/DetailsCard.vue'
import { type MetaItem } from '@/components/common/DetailsCard.vue'
import { CalendarDays, Earth, RulerDimensionLine } from 'lucide-vue-next'

const info: MetaItem[] = [
  {
    icon: CalendarDays,
    label: 'Added',
    value: '10.08.2026',
  },
  {
    icon: Earth,
    label: 'Public visibility',
  },
  {
    icon: RulerDimensionLine,
    label: 'Size',
    value: 'XS',
  },
]

const fabricData = {
  title: 'Small fabric',
  imageSrc: sampleFabricImg,
  alt: 'Red fabric in small white dots and white bigger hearts. Very irregular with blue borders.',
  tags: ['Cotton', 'Linen', 'Blend'],
  description:
    'Classic red and white micro-print woven fabric. Crisp, lightweight, and structured, ideal for shirts, summer dresses, and detailed garment assembly.',
  info,
}
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader :title="fabricData.title">
        <!-- <template #actions>
          Place for favourite, options buttons
        </template> -->
      </PageHeader>

      <main class="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        <div class="w-full aspect-square max-h-[500px] md:col-span-2">
          <ImagePreview :src="fabricData.imageSrc" :alt="fabricData.alt" />
        </div>

        <div class="md:col-span-3">
          <DetailsCard 
            :description="fabricData.description" 
            :tags="fabricData.tags" 
            :meta-items="fabricData.info"
          />
        </div>

      </main>
    </div>
  </GridLayout>
</template>
