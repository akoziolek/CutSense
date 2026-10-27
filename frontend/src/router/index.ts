import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { consumeReturnTo } from '../utils/returnTo'

const LandingPage = () => import('../views/LandingPage.vue')
const ComingSoonPage = () => import('../views/ComingSoonPage.vue') // temporary, to change for correct ones later
const FabricPage = () => import('../views/fabrics/FabricView.vue')
const FabricsPage = () => import('../views/fabrics/FabricsView.vue')
const NewFabricPage = () => import('../views/fabrics/NewFabricView.vue')
const FabricEditPage = () => import('../views/fabrics/FabricEdit.vue')

const PatternPage = () => import('../views/patterns/PatternView.vue')
const NewPatternPage = () => import('../views/patterns/NewPatternView.vue')

const routes = [
  { path: '/', name: 'Landing', component: LandingPage, meta: { isPublic: true } },

  // public pages (guests can browse public patterns)
  { path: '/patterns', name: 'Patterns', component: ComingSoonPage, meta: { isPublic: true } },
  {
    path: '/patterns/new',
    name: 'pattern-new',
    component: NewPatternPage,
  },
  {
    path: '/patterns/:id',
    name: 'pattern-details',
    component: PatternPage,
    props: true,
    meta: { isPublic: true },
  },

  // pages that are private unless explicitly marked public above
  { path: '/home', name: 'Home', component: ComingSoonPage },
  { path: '/optimizations', name: 'Optimizations', component: ComingSoonPage },
  { path: '/fabrics', name: 'Fabrics', component: FabricsPage },
  {
    path: '/fabrics/:id',
    name: 'FabricDetails',
    component: FabricPage,
    props: true,
  },
  {
    path: '/fabrics/:id/edit',
    name: 'FabricEdit',
    component: FabricEditPage,
    props: true,
  },
  {
    path: '/fabrics/new',
    name: 'AddFabric',
    component: NewFabricPage,
  },
  { path: '/account', name: 'Account', component: ComingSoonPage },

  // needs to stay last, so that it does not override other routes
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundPage.vue'),
    meta: { isPublic: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const { state, loadUser } = useAuth()
  await loadUser()

  if (!to.meta.isPublic && !state.user) {
    return { name: 'Landing', query: { login: '1', redirect: to.fullPath } }
  }

  // existing user came back from Google to "/": continue where they wanted to go
  if (state.user && to.name === 'Landing' && !to.query.registration) {
    const target = consumeReturnTo()
    if (target !== '/') return target
  }
})

export default router
