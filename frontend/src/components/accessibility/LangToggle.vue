<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Globe } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const { t, locale } = useI18n()
const isOpen = ref(false)

const supportedLocales = [
  { code: 'pl', labelKey: 'common.language.pl' },
  { code: 'en', labelKey: 'common.language.en' },
]

function setLanguage(newLocale: string) {
  locale.value = newLocale
  localStorage.setItem('user-locale', newLocale)
}
</script>

<template>
  <DropdownMenu :modal="false" v-model:open="isOpen">
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="h-9 w-9"
        :aria-label="t('common.navigation.selectLanguage')"
      >
        <Globe class="w-5 h-5" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      align="end"
      :align-offset="-24"
      :side-offset="12"
      class="w-48 border-2 p-0 overflow-hidden"
    >
      <DropdownMenuItem
        v-for="lang in supportedLocales"
        :key="lang.code"
        class="cursor-pointer rounded-none px-4 py-2.5 focus:bg-brand-green focus:text-brand-green-foreground"
        :class="{ 'font-bold bg-muted/70': locale === lang.code }"
        @select="setLanguage(lang.code)"
      >
        {{ t(lang.labelKey) }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>