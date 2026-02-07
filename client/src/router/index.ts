import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'MainMenu',
    component: () => import('@/views/MainMenuView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/event',
    name: 'Event',
    component: () => import('@/views/EventView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/party',
    name: 'Party',
    component: () => import('@/views/PartyView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/InventoryView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dices',
    name: 'Dices',
    component: () => import('@/views/DicesView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    // Redirect to login if not authenticated
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && userStore.isAuthenticated) {
    // Redirect to main menu if already authenticated
    next({ name: 'MainMenu' })
  } else {
    next()
  }
})

export default router
