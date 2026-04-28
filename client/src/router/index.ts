import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/stores/user";

const routes = [
  {
    path: "/",
    name: "Landing",
    component: () => import("@/views/LandingView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/LoginView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/terms",
    name: "Terms",
    component: () => import("@/views/TermsView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/privacy",
    name: "Privacy",
    component: () => import("@/views/PrivacyView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/menu",
    name: "MainMenu",
    component: () => import("@/views/MainMenuView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/event",
    name: "Event",
    component: () => import("@/views/EventView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/event-choice",
    name: "EventChoice",
    component: () => import("@/views/EventChoiceView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/battle",
    name: "Battle",
    component: () => import("@/views/BattleView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/wild-encounter",
    name: "WildEncounter",
    component: () => import("@/views/WildEncounterView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/merchant",
    name: "Merchant",
    component: () => import("@/views/MerchantView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/party",
    name: "Party",
    component: () => import("@/views/PartyView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/evolutions",
    name: "Evolutions",
    component: () => import("@/views/EvolutionsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/inventory",
    name: "Inventory",
    redirect: "/menu",
    meta: { requiresAuth: true },
  },
  {
    path: "/dice",
    name: "Dice",
    component: () => import("@/views/DiceView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/dice-test",
    name: "DiceTest",
    component: () => import("@/views/DiceTest.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  // If route requires auth and user has a stored userId but not fully authenticated,
  // try to get current user from backend (this validates the token)
  if (to.meta.requiresAuth && !userStore.username) {
    try {
      await userStore.getCurrentUser();
    } catch (error) {
      // Token is invalid or expired, clear state and redirect to login
      console.log("Failed to validate token, redirecting to login");
      userStore.logout();
      next({ name: "Login", query: { redirect: to.fullPath } });
      return;
    }
  }
  console.log(to.fullPath);
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    // Redirect to login if not authenticated
    next({ name: "Login", query: { redirect: to.fullPath } });
  } else if (to.name === "Login" && to.fullPath.includes("auth=success")) {
    // After successful OAuth login, redirect to main menu
    await userStore.getCurrentUser();
    next({ name: "MainMenu" });
  } else if (to.name === "Landing" && userStore.isAuthenticated) {
    next({ name: "MainMenu" });
  } else if (to.name === "Login" && userStore.isAuthenticated) {
    // Redirect to main menu if already authenticated
    next({ name: "MainMenu" });
  } else {
    next();
  }
});

export default router;
