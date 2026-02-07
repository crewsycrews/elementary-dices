import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";

// Import types from shared package
import type { User, ApiUserResponse } from '@elementary-dices/shared'

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
    const stats = ref<UserProfile["stats"] | null>(null);

    // Computed
    const isAuthenticated = computed(() => userId.value !== null);

    // Actions
    async function fetchUser(id: string) {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(api.api.users[id].get(), {
          silent: false,
        });

        if (response.data) {
          const user = response.data.user as UserProfile; // Keep cast for stats field
          userId.value = user.id;
          username.value = user.username;
          email.value = user.email;
          currency.value = user.currency;
          stats.value = user.stats;
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
        const response = await apiCall(api.api.users.post(data), {
          successMessage: "User created successfully!",
        });

        if (response.data) {
          const user = response.data.user;
          userId.value = user.id;
          username.value = user.username;
          email.value = user.email;
          currency.value = user.currency;
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
        const response = await apiCall(api.api.users.login.post(data), {
          successMessage: "Login successful!",
        });

        if (response.data) {
          const user = response.data.user;
          userId.value = user.id;
          username.value = user.username;
          email.value = user.email;
          currency.value = user.currency;
          return response.data.user;
        }
      } catch (error) {
        console.error("Failed to login:", error);
        throw error;
      }
    }

    async function updateCurrency(
      amount: number,
      operation: "add" | "subtract" | "set" = "set",
    ) {
      if (!userId.value) return;

      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(
          api.api.users[userId.value].currency.patch({ amount, operation }),
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

    function logout() {
      userId.value = null;
      username.value = "";
      email.value = "";
      currency.value = 0;
      stats.value = null;
    }

    return {
      // State
      userId,
      username,
      email,
      currency,
      stats,
      // Computed
      isAuthenticated,
      // Actions
      fetchUser,
      createUser,
      loginUser,
      updateCurrency,
      logout,
    };
  },
  {
    persist: {
      key: "elementary-dices-user",
      storage: localStorage,
      paths: ["userId", "username", "email"], // Only persist these fields
    },
  },
);
