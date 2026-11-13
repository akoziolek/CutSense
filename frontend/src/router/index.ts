import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { consumeReturnTo } from '../utils/returnTo'

const LandingPage = () => import('../views/LandingPage.vue')
const AccountPage = () => import('../views/account/AccountView.vue')
const ComingSoonPage = () => import('../views/ComingSoonPage.vue')
const FabricPage = () => import('../views/fabrics/FabricView.vue')
const FabricsPage = () => import('../views/fabrics/FabricsView.vue')
const NewFabricPage = () => import('../views/fabrics/NewFabricView.vue')
const FabricEditPage = () => import('../views/fabrics/FabricEditView.vue')
const PatternPage = () => import('../views/patterns/PatternView.vue')
const PatternsPage = () => import('../views/patterns/PatternsView.vue')
const NewPatternPage = () => import('../views/patterns/NewPatternView.vue')
const PatternEditPage = () => import('../views/patterns/PatternEditView.vue')
const OptimizationsPage = () => import('../views/optimizations/OptimizationsView.vue')
const NewOptimizationPage = () => import('../views/optimizations/NewOptimizationView.vue')

const routes = [
  { path: '/', name: 'Landing', component: LandingPage, meta: { isPublic: true } },

  // public pages (guests can browse public patterns)
  { path: '/patterns', name: 'Patterns', component: PatternsPage, meta: { isPublic: true } },
  {
    path: '/patterns/new',
    name: 'PatternNew',
    component: NewPatternPage,
  },
  {
    path: '/patterns/:id/edit',
    name: 'PatternEdit',
    component: PatternEditPage,
    props: true,
  },
  {
    path: '/patterns/:id',
    name: 'PatternDetails',
    component: PatternPage,
    props: true,
    meta: { isPublic: true },
  },

  // pages that are private unless explicitly marked public above
  { path: '/home', name: 'Home', component: ComingSoonPage },
  { path: '/account', name: 'UserAccount', component: AccountPage },
  {
    path: '/optimizations',
    name: 'Optimizations',
    component: OptimizationsPage,
    meta: { isPublic: true },
  },
  {
    path: '/optimizations/new',
    name: 'OptimizationNew',
    component: NewOptimizationPage,
    meta: { isPublic: true },
  },

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
  try {
    await loadUser()
  } catch {}

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
