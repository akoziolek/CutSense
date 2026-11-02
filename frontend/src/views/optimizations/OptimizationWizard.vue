<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ChevronRight, Check, Scissors } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, ApiError } from '@/api/client'
import type { PatternListResponse } from '@/types/pattern'
import type { FabricListResponse } from '@/types/fabric'
import { formatCardDate } from '@/utils/formatCardDate'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { state: authState } = useAuth()
const isLoggedIn = computed(() => !!authState.user)

const currentStep = ref(1)
const isSubmitting = ref(false)
const submitError = ref('')

const form = reactive({
  name: 'New Optimization',
  patternId: null as number | null,
  fabricSourceType: 'custom' as 'custom' | 'library',
  fabricId: null as number | null,
  customFabric: {
    width: 145,
    height: 290,
  },
  seamAllowance: 10,
  cuttingAllowance: 5,
  elements: [] as Array<{
    patternPieceId: number
    normalCount: number
    mirroredCount: number
    rotationAngle: number
  }>,
  algorithmId: 1,
})

const totalSteps = 5

const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 1: return 'Pattern library'
    case 2: return 'Fabric Source'
    case 3: return form.fabricSourceType === 'custom' ? 'Custom dimensions' : 'Fabric library'
    case 4: return 'Optimization elements'
    case 5: return 'Nesting strategy'
    default: return 'Optimization'
  }
})

const nextStep = () => {
  if (currentStep.value < totalSteps) currentStep.value++
}
const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
  else router.push({ name: 'Optimizations' })
}

// Data loaders
const patternsData = ref<PatternListResponse | null>(null)
const fabricsData = ref<FabricListResponse | null>(null)

const loadPatterns = async () => {
  try {
    patternsData.value = await api<PatternListResponse>('/patterns?limit=50')
  } catch (e) {
    console.error('Failed to load patterns for wizard', e)
  }
}

const loadFabrics = async () => {
  try {
    fabricsData.value = await api<FabricListResponse>('/fabrics?limit=50')
  } catch (e) {
    console.error('Failed to load fabrics for wizard', e)
  }
}

const selectPattern = (id: number) => {
  form.patternId = id
  form.elements = [
    { patternPieceId: 1, normalCount: 1, mirroredCount: 0, rotationAngle: 0 }
  ]
}

const submitOptimization = async () => {
  if (!form.patternId) return
  isSubmitting.value = true
  submitError.value = ''

  try {
    const payload = {
      name: form.name,
      patternId: form.patternId,
      fabricSourceType: form.fabricSourceType,
      fabricId: form.fabricSourceType === 'library' ? form.fabricId : undefined,
      customFabric: form.fabricSourceType === 'custom' ? form.customFabric : undefined,
      seamAllowance: form.seamAllowance,
      cuttingAllowance: form.cuttingAllowance,
      elements: form.elements,
      algorithmId: form.algorithmId,
    }

    await api('/optimizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    router.push({ name: 'Optimizations' })
  } catch (e) {
    submitError.value = e instanceof ApiError ? e.body.message : 'Failed to create optimization.'
  } finally {
    isSubmitting.value = false
  }
}

loadPatterns()
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-8">
      <div class="flex items-center justify-between">
        <PageHeader>
          <button @click="prevStep" class="mr-3 inline-flex items-center text-muted-foreground hover:text-foreground cursor-pointer">
            <ArrowLeft class="size-5" />
          </button>
          <span>{{ stepTitle }}</span>
        </PageHeader>
        <span class="text-xs font-medium text-muted-foreground">Step {{ currentStep }} of {{ totalSteps }}</span>
      </div>

      <!-- STEP 1: Pattern Selection -->
      <div v-if="currentStep === 1" class="space-y-6">
        <p class="text-xs text-muted-foreground">Select a pattern to include in the optimization layout.</p>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div
            v-for="pattern in patternsData?.items ?? []"
            :key="pattern.id"
            @click="selectPattern(pattern.id)"
            :class="[
              'cursor-pointer rounded-xl border p-4 space-y-3 transition-all relative bg-card',
              form.patternId === pattern.id ? 'border-foreground ring-2 ring-foreground/20 bg-brand-green/10' : 'border-border'
            ]"
          >
            <div class="aspect-square w-full rounded-md bg-muted flex items-center justify-center">
              <Scissors class="size-8 text-muted-foreground" />
            </div>
            <div>
              <h4 class="font-bold text-sm">{{ pattern.name }}</h4>
              <p class="text-xs text-muted-foreground">{{ formatCardDate(pattern.createdAt) }} • {{ pattern.size }}</p>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <Button @click="nextStep" :disabled="!form.patternId" class="gap-2">
            Next <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>

      <!-- STEP 2: Fabric Source Selection -->
      <div v-else-if="currentStep === 2" class="space-y-6">
        <div class="grid grid-cols-2 gap-6 max-w-xl mx-auto py-12">
          <div
            @click="form.fabricSourceType = 'custom'"
            :class="['cursor-pointer rounded-xl border p-6 text-center space-y-3 transition-all', form.fabricSourceType === 'custom' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border']"
          >
            <h3 class="font-bold text-sm">Custom Dimensions</h3>
            <p class="text-xs text-muted-foreground">Enter width and length for standard rolls or rectangular sheets.</p>
          </div>
          <div
            @click="form.fabricSourceType = 'library'; loadFabrics()"
            :class="['cursor-pointer rounded-xl border p-6 text-center space-y-3 transition-all', form.fabricSourceType === 'library' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border']"
          >
            <h3 class="font-bold text-sm">Fabric Library</h3>
            <p class="text-xs text-muted-foreground">Pick a pre-configured shape or saved scrap from your library.</p>
          </div>
        </div>
        <div class="flex justify-between pt-4">
          <Button variant="outline" @click="prevStep">Back</Button>
          <Button @click="nextStep" class="gap-2">
            Next <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>

      <!-- STEP 3: Fabric Details -->
      <div v-else-if="currentStep === 3" class="space-y-6">
        <div v-if="form.fabricSourceType === 'custom'" class="max-w-xl mx-auto space-y-6 py-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-xs font-semibold">Width (cm)</label>
              <Input v-model.number="form.customFabric.width" type="number" min="1" />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-semibold">Height (cm)</label>
              <Input v-model.number="form.customFabric.height" type="number" min="1" />
            </div>
          </div>
        </div>

        <div v-else class="space-y-6">
          <p class="text-xs text-muted-foreground">Select a fabric piece from your saved library.</p>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div
              v-for="fabric in fabricsData?.items ?? []"
              :key="fabric.id"
              @click="form.fabricId = fabric.id"
              :class="[
                'cursor-pointer rounded-xl border p-4 space-y-3 transition-all bg-card',
                form.fabricId === fabric.id ? 'border-foreground ring-2 ring-foreground/20 bg-brand-green/10' : 'border-border'
              ]"
            >
              <div class="aspect-square w-full rounded-md bg-muted flex items-center justify-center overflow-hidden">
                <img v-if="fabric.pictureUrl" :src="fabric.pictureUrl" class="w-full h-full object-cover" />
                <Scissors v-else class="size-8 text-muted-foreground" />
              </div>
              <div>
                <h4 class="font-bold text-sm">{{ fabric.name }}</h4>
                <p class="text-xs text-muted-foreground">{{ formatCardDate(fabric.createdAt) }} • {{ (fabric.areaMm2 / 1_000_000).toFixed(1) }} m²</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-between pt-4">
          <Button variant="outline" @click="prevStep">Back</Button>
          <Button @click="nextStep" :disabled="form.fabricSourceType === 'library' && !form.fabricId" class="gap-2">
            Next <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>

      <!-- STEP 4: Element & Allowance Configuration -->
      <div v-else-if="currentStep === 4" class="space-y-6">
        <div class="space-y-6 max-w-2xl mx-auto">
          <!-- Global Allowances -->
          <div class="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 bg-card">
            <div class="space-y-2">
              <label class="text-xs font-semibold">Seam Allowance (mm)</label>
              <Input v-model.number="form.seamAllowance" type="number" min="0" />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-semibold">Cutting Allowance (mm)</label>
              <Input v-model.number="form.cuttingAllowance" type="number" min="0" />
            </div>
          </div>

          <!-- Per-Piece Config -->
          <div v-for="(el, idx) in form.elements" :key="idx" class="rounded-xl border border-border p-4 space-y-4 bg-card">
            <h4 class="font-bold text-sm">Pattern Piece #{{ el.patternPieceId }}</h4>
            <div class="grid grid-cols-3 gap-4 text-xs">
              <div class="space-y-1">
                <span>Normal copies</span>
                <Input v-model.number="el.normalCount" type="number" min="0" class="h-8" />
              </div>
              <div class="space-y-1">
                <span>Mirrored copies</span>
                <Input v-model.number="el.mirroredCount" type="number" min="0" class="h-8" />
              </div>
              <div class="space-y-1">
                <span>Rotation (°)</span>
                <Input v-model.number="el.rotationAngle" type="number" class="h-8" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-between pt-4">
          <Button variant="outline" @click="prevStep">Back</Button>
          <Button @click="nextStep" class="gap-2">
            Next <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>

      <!-- STEP 5: Algorithm Selection -->
      <div v-else-if="currentStep === 5" class="space-y-6">
        <p class="text-xs text-muted-foreground">Select the nesting algorithm to execute the optimization.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto py-6">
          <div
            @click="form.algorithmId = 1"
            :class="['cursor-pointer rounded-xl border p-6 text-center space-y-3 transition-all bg-card', form.algorithmId === 1 ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border']"
          >
            <div class="size-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Check v-if="form.algorithmId === 1" class="size-6 text-primary" />
            </div>
            <h3 class="font-bold text-sm">Algorithm 1</h3>
            <p class="text-xs text-muted-foreground">Standard high-efficiency nesting strategy.</p>
          </div>
        </div>

        <p v-if="submitError" class="text-xs text-destructive text-center">{{ submitError }}</p>

        <div class="flex justify-between pt-4">
          <Button variant="outline" @click="prevStep">Back</Button>
          <Button @click="submitOptimization" :disabled="isSubmitting" class="gap-2 bg-primary">
            {{ isSubmitting ? 'Running...' : 'Run Optimization' }}
          </Button>
        </div>
      </div>

    </div>
  </GridLayout>
</template>