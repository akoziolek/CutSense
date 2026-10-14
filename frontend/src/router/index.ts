import { createRouter, createWebHistory } from 'vue-router'

const LandingPage = () => import('../views/LandingPage.vue')

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
  }, {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
