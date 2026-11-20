import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'

export interface WizardNav {
  canGoBack: ComputedRef<boolean>
  back: () => void
}

const WIZARD_NAV_KEY: InjectionKey<WizardNav> = Symbol('wizardNav')

export const provideWizardNav = (nav: WizardNav) => provide(WIZARD_NAV_KEY, nav)
export const useWizardNav = () => inject(WIZARD_NAV_KEY, null)