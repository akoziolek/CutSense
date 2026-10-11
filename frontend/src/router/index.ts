import { createRouter, createWebHistory } from 'vue-router'

const FabricDetailsPage = () => import('../views/FabricDetailsView.vue')

const routes = [
  { path: '/fabrics/:id', name: 'fabric-details', component: FabricDetailsPage, props: true },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
