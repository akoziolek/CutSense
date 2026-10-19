import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { consumeReturnTo } from '../utils/returnTo'
import { useFabricWizardStore } from '@/stores/fabricWizard.ts'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

const LandingPage = () => import('../views/LandingPage.vue')
const ComingSoonPage = () => import('../views/ComingSoonPage.vue') // temporary, to change for correct ones later
const FabricPage = () => import('../views/fabrics/FabricView.vue')
const FabricsPage = () => import('../views/fabrics/FabricsView.vue')
const FabricPhotoConfigPage = () => import('../views/fabrics/FabricPhotoConfigView.vue')
const UploadImagePage = () => import('../views/fabrics/FabricUploadView.vue')

const routes = [
  { path: '/', name: 'Landing', component: LandingPage },

  // public pages (guests can browse public patterns)
  { path: '/patterns', name: 'Patterns', component: ComingSoonPage },

  // pages that need a logged-in user
  { path: '/home', name: 'Home', component: ComingSoonPage, meta: { requiresAuth: true } },
  {
    path: '/optimizations',
    name: 'Optimizations',
    component: ComingSoonPage,
    meta: { requiresAuth: true },
  },
  { path: '/fabrics', name: 'Fabrics', component: FabricsPage, meta: { requiresAuth: true } },
  {
    path: '/fabrics/:id',
    name: 'fabric-details',
    component: FabricPage,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/new',
    name: 'AddFabric',
    component: UploadImagePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/configure',
    name: 'FabricPhotoConfig',
    component: FabricPhotoConfigPage,
    beforeEnter: async () => {
      // const wizardStore = useFabricWizardStore()

      // if (!wizardStore.isHydrated) {
      //   await wizardStore.initFromIndexedDB()
      // }

      // if (!wizardStore.file) {
      //   return { name: 'AddFabric' } // lub { name: 'Fabrics' }
      // }
    },
    meta: { requiresAuth: true },
  },
  { path: '/account', name: 'Account', component: ComingSoonPage, meta: { requiresAuth: true } },

  // needs to stay last, so that it does not override other routes
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const { state, loadUser } = useAuth()
  await loadUser()

  if (to.meta.requiresAuth && !state.user) {
    return { name: 'Landing', query: { login: '1', redirect: to.fullPath } }
  }

  // existing user came back from Google to "/": continue where they wanted to go
  if (state.user && to.name === 'Landing' && !to.query.registration) {
    const target = consumeReturnTo()
    if (target !== '/') return target
  }
})

export default router
