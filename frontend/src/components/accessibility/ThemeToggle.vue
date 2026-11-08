<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import { Sun, Moon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="h-9 w-9"
    :aria-label="t('common.navigation.toggleTheme')"
    @click="toggleDark()"
  >
    <Sun v-if="isDark" class="h-6 w-6 transition-all" />
    <Moon v-else class="h-6 w-6 transition-all" />
  </Button>
</template>