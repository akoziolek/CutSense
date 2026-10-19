<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  useFilter,
} from 'reka-ui'
import { useAddFabricFormGuard } from '@/composables/useAddFabricFormGuard'
import PageHeader from '@/components/common/PageHeader.vue'
import StepCounter from '@/components/forms/StepCounter.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import DiscardNewFabricModal from '@/components/fabrics/DiscardNewFabricModal.vue'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupText,
} from '@/components/ui/input-group'
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from '@/components/ui/tags-input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CheckIcon, ChevronDown } from 'lucide-vue-next'
import { api, ApiError } from '@/api/client'

const { isCancelModalOpen, handleCancel, confirmExit } = useAddFabricFormGuard()
interface FabricTag {
  id: number
  name: string
}

const fabricName = ref('')
const description = ref('')
const tags = ref<string[]>(['cotton', 'polyester'])
const availableTags = ref<FabricTag[]>([])
const tagLoadError = ref('')

const MAX_NAME_LENGTH = 35
const MAX_DESC_LENGTH = 45

const searchTerm = ref('')
const open = ref(false)

const containerRef = ref<HTMLDivElement | null>(null)
const containerWidth = ref<number>(0)
let resizeObserver: ResizeObserver | null = null

const loadAvailableTags = async () => {
  tagLoadError.value = ''
  try {
    availableTags.value = await api<FabricTag[]>('/fabrics/tags')
  } catch (error) {
    tagLoadError.value =
      error instanceof ApiError
        ? error.body.message
        : 'Could not load fabric tags. Please try again.'
  }
}

onMounted(() => {
  void loadAvailableTags()

  if (containerRef.value) {
    containerWidth.value = containerRef.value.offsetWidth
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLElement) {
          containerWidth.value = entry.target.offsetWidth
        }
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

const { contains } = useFilter({ sensitivity: 'base' })

const filteredTags = computed(() =>
  searchTerm.value === ''
    ? availableTags.value
    : availableTags.value.filter((tag) => contains(tag.name, searchTerm.value)),
)

watch(searchTerm, (val) => {
  if (val.trim().length > 0) {
    open.value = true
  }
})

const handleSubmit = () => {
  // saving
}
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader title="Fabric details" :show-back="true">
        <template #actions>
          <StepCounter :current-step="3" :total-steps="3" class="mt-2" />
        </template>
      </PageHeader>

      <div class="max-w-3xl bg-background rounded-2xl px-8 py-2 space-y-6 mx-5">
        <!-- 1. Fabric Name -->
        <div class="space-y-2">
          <Label for="fabric-name" class="text-md font-semibold font-inter text-foreground">
            Fabric name <span class="text-destructive">*</span>
          </Label>
          <InputGroup>
            <InputGroupInput
              id="fabric-name"
              v-model="fabricName"
              placeholder="e.g Linen fabric"
              :maxlength="MAX_NAME_LENGTH"
            />
            <InputGroupAddon align="block-end">
              <InputGroupText class="ml-auto text-xs font-mono text-muted-foreground">
                {{ fabricName.length }}/{{ MAX_NAME_LENGTH }}
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <!-- 2. Description -->
        <div class="space-y-2">
          <Label for="description" class="text-md font-semibold font-inter text-foreground">
            Description
          </Label>
          <InputGroup>
            <InputGroupTextarea
              id="description"
              v-model="description"
              placeholder="Enter composition, weight, or intended use..."
              :maxlength="MAX_DESC_LENGTH"
              rows="4"
            />
            <InputGroupAddon align="block-end">
              <InputGroupText class="ml-auto text-xs font-mono text-muted-foreground">
                {{ description.length }}/{{ MAX_DESC_LENGTH }}
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div class="space-y-2">
          <Label class="text-md font-semibold font-inter text-foreground">Tags</Label>

          <Popover v-model:open="open">
            <ListboxRoot v-model="tags" highlight-on-hover multiple>
              <PopoverAnchor as-child>
                <div ref="containerRef" class="w-full">
                  <TagsInput
                    v-slot="{ modelValue: tagItems }"
                    v-model="tags"
                    class="w-full flex-col items-start gap-2 p-3 min-h-14 font-inter bg-background border border-input rounded-xl focus-within:ring-2 focus-within:ring-ring"
                  >
                    <div v-if="tagItems.length > 0" class="flex flex-wrap gap-1.5 w-full">
                      <TagsInputItem
                        v-for="item in tagItems"
                        :key="item.toString()"
                        :value="item.toString()"
                        class="bg-brand-grey border border-input px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                      >
                        <TagsInputItemText />
                        <TagsInputItemDelete />
                      </TagsInputItem>
                    </div>

                    <div class="flex items-center w-full gap-2">
                      <ListboxFilter v-model="searchTerm" as-child>
                        <TagsInputInput
                          placeholder="Search or add tags..."
                          class="w-full text-sm bg-transparent p-0 focus:outline-hidden border-none shadow-none cursor-text"
                          @keydown.enter.prevent
                          @keydown.down="open = true"
                        />
                      </ListboxFilter>

                      <PopoverTrigger as-child>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          class="order-last shrink-0 self-center text-muted-foreground hover:text-foreground"
                        >
                          <ChevronDown class="size-4" />
                        </Button>
                      </PopoverTrigger>
                    </div>
                  </TagsInput>
                </div>
              </PopoverAnchor>

              <PopoverContent
                side="bottom"
                align="start"
                :side-offset="6"
                :style="{ width: containerWidth ? `${containerWidth}px` : 'auto' }"
                class="p-1 bg-popover rounded-xl border border-border shadow-md max-w-none"
                @open-auto-focus.prevent
              >
                <ListboxContent
                  class="max-h-[144px] scroll-py-1 overflow-x-hidden overflow-y-auto space-y-0.5 empty:after:content-['No_matching_tags'] empty:p-3 empty:text-xs empty:text-center empty:text-muted-foreground empty:after:block"
                  tabindex="-1"
                >
                  <ListboxItem
                    v-for="item in filteredTags"
                    :key="item.id"
                    :value="item.name"
                    class="data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-inter outline-hidden select-none"
                    @select="
                      () => {
                        searchTerm = ''
                      }
                    "
                  >
                    <span>{{ item.name }}</span>

                    <ListboxItemIndicator class="ml-auto inline-flex items-center justify-center">
                      <CheckIcon class="h-4 w-4 text-primary" />
                    </ListboxItemIndicator>
                  </ListboxItem>
                </ListboxContent>
              </PopoverContent>
            </ListboxRoot>
          </Popover>
          <p v-if="tagLoadError" class="text-xs text-destructive" role="alert">
            {{ tagLoadError }}
            <button
              type="button"
              class="underline underline-offset-2"
              @click="loadAvailableTags"
            >
              Try again
            </button>
          </p>
        </div>

        <p class="text-xs text-destructive pt-2">* Required field</p>
      </div>
    </div>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Save"
      @cancel="handleCancel"
      @next="handleSubmit"
    />

    <DiscardNewFabricModal v-model:open="isCancelModalOpen" @confirm="confirmExit" />
  </GridLayout>
</template>
