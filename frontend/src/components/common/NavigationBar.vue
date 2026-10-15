<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Moon, Globe, User, Menu, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth, login } from '@/composables/useAuth'

const route = useRoute();
const router = useRouter();
const { state, logout } = useAuth()

const isLoggedIn = computed(() => !!state.user)
const userName = computed(() => state.user?.nickname ?? '')
const isMenuOpen = ref(false)

function isActive(path: string) {
  return route.path === path
}

async function onLogout() {
  isMenuOpen.value = false
  await logout()
  if (route.meta.requiresAuth) router.replace({ name: 'Landing' })
}

const guestLinks = [
  { name: 'Patterns', path: '/patterns' },
]

const authLinks = [
  { name: 'Home', path: '/home' },
  { name: 'Optimizations', path: '/optimizations' },
  { name: 'Fabrics', path: '/fabrics' },
  { name: 'Patterns', path: '/patterns' },
]

const navLinks = computed(() => (isLoggedIn.value ? authLinks : guestLinks))
</script>

<template>
  <header class="w-full py-6 sm:py-6">
    <nav class="relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-auto">
      <div
        class="flex items-center justify-between bg-popover backdrop-blur-md text-foreground border-2 border-border rounded-lg shadow-md h-14 sm:h-16 px-4 sm:px-6"
      >
        <RouterLink
          to="/"
          class="font-bookletter font-bold text-2xl tracking-wide hover:opacity-80 transition-opacity text-foreground"
        >
          CutSense
        </RouterLink>

        <div class="flex items-center gap-4 sm:gap-2">
          <!-- DESKTOP navigation -->
          <div class="hidden lg:flex items-center gap-1 xl:gap-2 text-base font-medium">
            <RouterLink
              v-for="link in navLinks"
              :key="link.path"
              :to="link.path"
              class="relative py-1 px-3 text-foreground transition-colors hover:bg-muted/40 hover:[text-shadow:_0.2px_0_0_currentColor] rounded-md"
              :class="{ 'font-semibold': isActive(link.path) }"
            >
              {{ link.name }}
              <span
                v-if="isActive(link.path)"
                class="absolute left-3 right-3 bottom-0 h-[2.5px] bg-accent rounded-full pointer-events-none"
              />
            </RouterLink>
          </div>

          <div class="flex items-center gap-1.5 text-foreground">
            <Button variant="ghost" size="icon" class="h-9 w-9" aria-label="Toggle theme">
              <Moon class="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" class="h-9 w-9" aria-label="Select language">
              <Globe class="w-5 h-5" />
            </Button>

            <div class="hidden lg:flex items-center">
              <template v-if="!isLoggedIn">
                <Button
                  @click="login()"
                  variant="default"
                  class="px-5 ml-4 rounded-lg font-inter transition-shadow hover:shadow-lg"
                >
                  Get started
                </Button>
              </template>

              <template v-else>
                <DropdownMenu :modal="false" v-model:open="isMenuOpen">
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="h-9 w-9" aria-label="User menu">
                      <User class="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    :align="'end'"
                    :align-offset="-24"
                    :side-offset="12"
                    class="hidden lg:block w-48 border-2 p-0 overflow-hidden"
                  >
                    <DropdownMenuItem
                      as-child
                      class="cursor-pointer rounded-none px-4 py-2.5 focus:bg-brand-green"
                    >
                      <RouterLink to="/account">My account</RouterLink>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      class="cursor-pointer rounded-none px-4 py-2.5 text-destructive focus:bg-destructive-foreground focus:text-destructive"
                      @select="onLogout"
                    >
                      Sign out
                    </DropdownMenuItem>

                    <DropdownMenuSeparator class="my-0" />

                    <DropdownMenuLabel class="font-normal text-xs text-muted-foreground px-4 py-3">
                      Signed as <span class="font-bold text-foreground">{{ userName }}</span>
                    </DropdownMenuLabel>
                  </DropdownMenuContent>
                </DropdownMenu>
              </template>
            </div>

            <!-- Mobile Hamburger Button -->
            <Button
              variant="ghost"
              size="icon"
              class="lg:hidden h-9 w-9 ml-1"
              aria-label="Toggle navigation"
              @click="isMenuOpen = !isMenuOpen"
            >
              <Menu v-if="!isMenuOpen" class="w-6 h-6" />
              <X v-else class="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Mobile navigation -->
      <transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="isMenuOpen"
          class="lg:hidden absolute left-4 right-4 sm:left-6 sm:right-6 top-[calc(100%+8px)] z-50 p-5 pb-4 bg-popover text-foreground border-2 border-border rounded-lg shadow-xl flex flex-col gap-2 font-medium"
        >
          <div v-if="isLoggedIn" class="text-xs text-muted-foreground">
            Signed as <span class="font-bold text-foreground">{{ userName }}</span>
            <Separator class="mt-4" />
          </div>

          <RouterLink
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="relative py-2 px-3 rounded-md transition-colors text-foreground hover:bg-muted/40"
            :class="{ 'font-semibold': isActive(link.path) }"
            @click="isMenuOpen = false"
          >
            {{ link.name }}
            <span
              v-if="isActive(link.path)"
              class="absolute left-3 right-3 bottom-0 h-[2.5px] bg-accent rounded-full pointer-events-none"
            />
          </RouterLink>

          <template v-if="!isLoggedIn">
            <Button
              variant="outline"
              class="border-2 border-border mt-2 w-full justify-center transition-shadow hover:shadow-lg"
              @click="() => { isMenuOpen = false; login() }"
            >
              Get started
            </Button>
          </template>

          <template v-else>
            <RouterLink
              to="/account"
              class="relative py-2 px-3 rounded-md transition-colors text-foreground hover:bg-muted/40"
              :class="{ 'font-semibold': isActive('/account') }"
              @click="isMenuOpen = false"
            >
              My account
              <span
                v-if="isActive('/account')"
                class="absolute left-3 right-3 bottom-0 h-[2.5px] bg-accent rounded-full pointer-events-none"
              />
            </RouterLink>

            <Separator class="my-1" />

            <button
              type="button"
              class="w-full text-left rounded-md px-3 py-2 text-destructive font-medium transition-colors hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
              @click="onLogout"
            >
              Sign out
            </button>
          </template>
        </div>
      </transition>
    </nav>
  </header>
</template>
