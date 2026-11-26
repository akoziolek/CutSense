import type { LocalizedText } from '@/types/common'

export function localizedText(value: string | LocalizedText, locale: string): string {
  if (typeof value === 'string') return value
  return value[locale as keyof LocalizedText] ?? value.en
}
