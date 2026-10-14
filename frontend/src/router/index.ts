import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [],
})

export default router

// const RETURN_KEY = 'returnTo';
// const isSafePath = (p: string | null): p is string => !!p && p.startsWith('/') && !p.startsWith('//');

// export function consumeReturnTo(): string {
//   const target = sessionStorage.getItem(RETURN_KEY);
//   sessionStorage.removeItem(RETURN_KEY);
//   return isSafePath(target) ? target : '/';
// }

// router.beforeEach(async (to) => {
//   const { state, loadUser } = useAuth();
//   await loadUser();

//   if (to.meta.requiresAuth && !state.user) {
//     return { name: 'Landing', query: { login: '1', redirect: to.fullPath } };
//   }

//   // existing user came back from Google to "/": continue where they wanted to go
//   if (state.user && to.name === 'Landing' && !to.query.registration) {
//     const target = consumeReturnTo();
//     if (target !== '/') return target;
//   }
// });
