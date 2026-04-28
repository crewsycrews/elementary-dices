import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";
import { useEventStore } from "./event";
import { useInventoryStore } from "./inventory";
import { useElementalsStore } from "./elementals";
import { useEvolutionStore } from "./evolution";

// Import types from shared package
import type { User } from "@elementary-dices/shared";

// Extended user profile type with stats (client-side)
type UserProfile = User & {
  stats: {
    total_elementals: number;
    active_elementals: number;
    backpack_elementals: number;
    total_dice: number;
    total_items: number;
  };
};

export const useUserStore = defineStore(
  "user",
  () => {
    // State
    const userId = ref<string | null>(null);
    const username = ref<string>("");
    const email = ref<string>("");
    const currency = ref<number>(0);
    const favoriteDiceId = ref<string | null>(null);
    const stats = ref<UserProfile["stats"] | null>(null);

    // Computed
    const isAuthenticated = computed(() => userId.value !== null);

    // Actions
    async function fetchUser(id: string) {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(() => api.api.users[id].get(), {
          silent: false,
        });

        if (response.data) {
          const user = response.data.user as UserProfile; // Keep cast for stats field
          userId.value = user.id;
          username.value = user.username;
          email.value = user.email;
          currency.value = user.currency;
          favoriteDiceId.value = user.favorite_dice_id ?? null;
          stats.value = user.stats;

          // Initialize event state from server when fetching user
          const eventStore = useEventStore();
          await eventStore.initializeEventState(user.id);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        throw error;
      }
    }

    async function createUser(data: {
      username: string;
      email: string;
      password: string;
    }) {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(() => api.api.users.post(data), {
          successMessage: "User created successfully!",
        });

        if (response.data) {
          const user = response.data.user;
          userId.value = user.id;
          username.value = user.username;
          email.value = user.email;
          currency.value = user.currency;
          favoriteDiceId.value = (user as any).favorite_dice_id ?? null;
          return response.data.user;
        }
      } catch (error) {
        console.error("Failed to create user:", error);
        throw error;
      }
    }

    async function loginUser(data: { username: string; password: string }) {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(() => api.api.auth.login.post(data), {
          successMessage: "Login successful!",
        });

        if (response.data) {
          const user = response.data.user;
          userId.value = user.id;
          username.value = user.username;
          email.value = user.email;
          currency.value = user.currency;
          favoriteDiceId.value = (user as any).favorite_dice_id ?? null;

          // Initialize event state from server after login
          const eventStore = useEventStore();
          await eventStore.initializeEventState(user.id);

          return response.data.user;
        }
      } catch (error) {
        console.error("Failed to login:", error);
        throw error;
      }
    }

    // Google OAuth login - redirects to Google
    function loginWithGoogle() {
      const rawApiUrl =
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_SERVER_URL ||
        window.location.origin;
      const apiUrl = rawApiUrl.replace(/\/+$/, "");
      window.location.href = `${apiUrl}/api/auth/google`;
    }

    // Handle OAuth callback - gets current user after successful OAuth
    async function handleOAuthCallback() {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(() => api.api.users.me.get(), {
          successMessage: "Logged in with Google!",
        });

        if (response.data) {
          const user = response.data.user;
          userId.value = user.id;
          username.value = user.username;
          email.value = user.email;
          currency.value = user.currency || 0;
          favoriteDiceId.value = (user as any).favorite_dice_id ?? null;

          // Initialize event state from server after OAuth login
          const eventStore = useEventStore();
          await eventStore.initializeEventState(user.id);

          return user;
        }
      } catch (error) {
        console.error("Failed to get user after OAuth:", error);
        throw error;
      }
    }

    // Get current authenticated user (for token refresh or session check)
    async function getCurrentUser() {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(() => api.api.users.me.get(), {
          silent: true,
        });

        if (response.data) {
          const user = response.data.user;
          userId.value = user.id;
          username.value = user.username;
          email.value = user.email;
          currency.value = user.currency || 0;
          favoriteDiceId.value = (user as any).favorite_dice_id ?? null;

          return user;
        }
      } catch (error) {
        console.error("Failed to get current user:", error);
        // Don't throw - just return null for failed auth check
        return null;
      }
    }

    // Refresh access token
    async function refreshAccessToken() {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(() => api.api.auth.refresh.post({}), {
          silent: true,
        });

        return response.data !== null;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        return false;
      }
    }

    async function updateCurrency(
      amount: number,
      operation: "add" | "subtract" | "set" = "set",
    ) {
      const currentUserId = userId.value;
      if (!currentUserId) return;

      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(
          () => api.api.users[currentUserId].currency.patch({ amount, operation }),
          { silent: true },
        );

        if (response.data) {
          const user = response.data.user;
          currency.value = user.currency;
        }
      } catch (error) {
        console.error("Failed to update currency:", error);
        throw error;
      }
    }

    async function updateFavoriteDice(playerDiceId: string) {
      const currentUserId = userId.value;
      if (!currentUserId) return;

      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(
          () =>
            api.api.users[currentUserId].patch({
              favorite_dice_id: playerDiceId,
            } as any),
          { silent: true },
        );

        if (response.data) {
          favoriteDiceId.value = (response.data.user as any).favorite_dice_id ?? null;
        }
      } catch (error) {
        console.error("Failed to update favorite dice:", error);
        throw error;
      }
    }

    // Clear local state without backend call (for session expiration)
    function clearLocalState() {
      userId.value = null;
      username.value = "";
      email.value = "";
      currency.value = 0;
      favoriteDiceId.value = null;
      stats.value = null;

      const eventStore = useEventStore();
      const inventoryStore = useInventoryStore();
      const elementalsStore = useElementalsStore();
      const evolutionStore = useEvolutionStore();

      eventStore.resetState();
      inventoryStore.resetState();
      elementalsStore.resetState();
      evolutionStore.resetState();
    }

    async function logout() {
      const { api, apiCall } = useApi();

      try {
        // Call backend logout to invalidate tokens
        await apiCall(() => api.api.auth.logout.post({}), {
          silent: true,
        });
      } catch (error) {
        console.error("Failed to logout from backend:", error);
        // Continue with local logout even if backend call fails
      }

      // Clear local state
      clearLocalState();
    }

    return {
      // State
      userId,
      username,
      email,
      currency,
      favoriteDiceId,
      stats,
      // Computed
      isAuthenticated,
      // Actions
      fetchUser,
      createUser,
      loginUser,
      loginWithGoogle,
      handleOAuthCallback,
      getCurrentUser,
      refreshAccessToken,
      updateCurrency,
      updateFavoriteDice,
      clearLocalState,
      logout,
    };
  },
  {
    persist: {
      key: "elementary-dices-user",
      storage: localStorage,
      paths: ["userId", "username", "email", "currency", "favoriteDiceId", "stats"], // Only persist these fields
    },
  },
);
