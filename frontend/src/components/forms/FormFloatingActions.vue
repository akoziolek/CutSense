<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, X } from 'lucide-vue-next'
import { useWizardNav } from '@/composables/useWizardNav'

const props = withDefaults(
  defineProps<{
    cancelTo?: RouteLocationRaw
    nextTo?: RouteLocationRaw
    cancelLabel?: string
    nextLabel?: string
    backLabel?: string
    disabled?: boolean
    showCancel?: boolean
    showNext?: boolean
    keyboard?: boolean
  }>(),
  {
    cancelLabel: 'Cancel',
    nextLabel: 'Next',
    disabled: false,
    showCancel: true,
    showNext: true,
    keyboard: true,
  },
)

const emit = defineEmits<{
  (e: 'cancel', event: MouseEvent | KeyboardEvent): void
  (e: 'next', event: MouseEvent | KeyboardEvent): void
}>()

const { t } = useI18n()
const wizardNav = useWizardNav()

const inWizard = computed(() => wizardNav !== null)
const showBackButton = computed(() => !!wizardNav?.canGoBack.value)
const showCancelButton = computed(() => props.showCancel && !inWizard.value)

const root = ref<HTMLElement | null>(null)

const handleCancel = (event: MouseEvent | KeyboardEvent) => {
  emit('cancel', event)
}

const handleBack = () => {
  wizardNav?.back()
}

const handleNext = (event: MouseEvent | KeyboardEvent) => {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  emit('next', event)
}

const OVERLAYS =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"]'
// fields where Enter/Esc have their own meaning (search, tags, line calibration)
const IGNORED = '[data-wizard-keys-ignore], [aria-haspopup]'

const onKeydown = (e: KeyboardEvent) => {
  if (!props.keyboard || e.defaultPrevented || e.repeat || e.isComposing) return
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
  if (e.key !== 'Enter' && e.key !== 'Escape') return
  if (document.querySelector(OVERLAYS)) return

  const target = e.target instanceof HTMLElement ? e.target : null
  if (target?.closest(IGNORED)) return

  if (e.key === 'Escape') {
    if (!props.showCancel || props.cancelTo) return
    e.preventDefault()
    handleCancel(e)
    return
  }

  // Enter
  if (!props.showNext || props.nextTo || props.disabled) return
  if (target) {
    if (target.closest('textarea, select, [contenteditable="true"]')) return
    if (root.value?.contains(target)) return

    const interactive = target.closest(
      'button, a, [role="button"], [role="switch"], [role="radio"], [role="checkbox"]',
    )
    if (interactive && !interactive.hasAttribute('aria-pressed')) return
  }
  e.preventDefault()
  handleNext(e)
}

onMounted(() => window.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <div
    ref="root"
    class="fixed bottom-14 right-8 sm:bottom-16 sm:right-14 z-50 flex items-center gap-3 transition-all duration-200"
  >
    <!-- Back (wizard steps 2+) -->
    <Button
      v-if="showBackButton"
      type="button"
      variant="default"
      class="px-6 rounded-md font-semibold font-inter shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
      @click="handleBack"
    >
      <ArrowLeft class="w-4 h-4 mr-2 stroke-[2.5]" />
      {{ props.backLabel ?? t('common.actions.back') }}
    </Button>

    <!-- Cancel (only outside wizards, e.g. edit forms) -->
    <Button
      v-if="showCancelButton"
      as-child
      variant="ghost"
      class="border-2 !border-warning-foreground !bg-warning !text-warning-foreground px-5 rounded-md font-semibold font-inter shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
    >
      <component
        :is="props.cancelTo ? RouterLink : 'button'"
        v-bind="props.cancelTo ? { to: props.cancelTo } : { type: 'button' }"
        aria-keyshortcuts="Escape"
        @click="handleCancel"
      >
        <X v-if="!props.cancelTo" class="w-4 h-4 stroke-[2.5]" />
        {{ props.cancelLabel }}
      </component>
    </Button>

    <Button
      v-if="props.showNext"
      as-child
      variant="default"
      class="px-6 rounded-md font-semibold font-inter shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
      :disabled="props.disabled"
    >
      <component
        :is="props.nextTo ? RouterLink : 'button'"
        v-bind="props.nextTo ? { to: props.nextTo } : { type: 'button' }"
        aria-keyshortcuts="Enter"
        @click="handleNext"
      >
        {{ props.nextLabel }}
        <ArrowRight class="w-4 h-4 ml-2 stroke-[2.5]" />
      </component>
    </Button>
  </div>
</template>