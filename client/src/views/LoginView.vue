<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
    <div class="w-full max-w-md space-y-6">
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-4xl font-bold">🎲 Elementary Dices</h1>
        <p class="text-muted-foreground">
          {{ isRegistering ? 'Create an account to start your adventure' : 'Welcome back, adventurer!' }}
        </p>
      </div>

      <!-- Login/Register Form -->
      <div class="p-6 border-2 rounded-lg bg-card shadow-xl space-y-4">
        <!-- Mode Toggle -->
        <div class="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            @click="isRegistering = false"
            class="flex-1 py-2 px-4 rounded font-semibold transition-all"
            :class="!isRegistering ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            Login
          </button>
          <button
            @click="isRegistering = true"
            class="flex-1 py-2 px-4 rounded font-semibold transition-all"
            :class="isRegistering ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            Register
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Username -->
          <div class="space-y-2">
            <label for="username" class="block text-sm font-semibold">
              Username
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              required
              minlength="3"
              maxlength="20"
              placeholder="Enter your username"
              class="w-full px-4 py-2 rounded-lg border-2 bg-background border-border focus:border-primary focus:outline-none transition-colors"
              :disabled="isLoading"
            />
            <p class="text-xs text-muted-foreground">3-20 characters</p>
          </div>

          <!-- Email (only for registration) -->
          <div v-if="isRegistering" class="space-y-2">
            <label for="email" class="block text-sm font-semibold">
              Email
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              placeholder="Enter your email"
              class="w-full px-4 py-2 rounded-lg border-2 bg-background border-border focus:border-primary focus:outline-none transition-colors"
              :disabled="isLoading"
            />
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-semibold">
              Password
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              :minlength="isRegistering ? 8 : undefined"
              placeholder="Enter your password"
              class="w-full px-4 py-2 rounded-lg border-2 bg-background border-border focus:border-primary focus:outline-none transition-colors"
              :disabled="isLoading"
            />
            <p v-if="isRegistering" class="text-xs text-muted-foreground">
              Minimum 8 characters
            </p>
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="p-3 bg-red-600/20 border-2 border-red-600 rounded-lg text-red-600 text-sm"
          >
            {{ errorMessage }}
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {{ isLoading ? 'Processing...' : isRegistering ? '🎮 Start Adventure' : '🔓 Login' }}
          </button>
        </form>

        <!-- Help Text -->
        <div class="text-center text-sm text-muted-foreground">
          <p v-if="!isRegistering">
            Don't have an account?
            <button
              @click="isRegistering = true"
              class="text-primary font-semibold hover:underline"
            >
              Register here
            </button>
          </p>
          <p v-else>
            Already have an account?
            <button
              @click="isRegistering = false"
              class="text-primary font-semibold hover:underline"
            >
              Login here
            </button>
          </p>
        </div>
      </div>

      <!-- Quick Start Demo (optional) -->
      <div class="text-center">
        <button
          @click="handleQuickStart"
          :disabled="isLoading"
          class="text-sm text-muted-foreground hover:text-foreground underline disabled:opacity-50"
        >
          Quick Start with Demo Account
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useUIStore } from '@/stores/ui';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const uiStore = useUIStore();

const isRegistering = ref(false);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const form = ref({
  username: '',
  email: '',
  password: '',
});

// Handle form submission
const handleSubmit = async () => {
  errorMessage.value = null;
  isLoading.value = true;

  try {
    if (isRegistering.value) {
      // Registration
      if (!form.value.email) {
        errorMessage.value = 'Email is required for registration';
        return;
      }

      await userStore.createUser({
        username: form.value.username,
        email: form.value.email,
        password: form.value.password,
      });

      uiStore.showToast('Account created successfully! Welcome! 🎉', 'success');
    } else {
      // Login - for now, just create/fetch user by username
      // In production, this would validate against backend
      try {
        // Try to find existing user by username (simplified auth)
        // In production, you'd have a proper login endpoint
        await userStore.createUser({
          username: form.value.username,
          email: `${form.value.username}@demo.com`, // Temporary for demo
          password: form.value.password,
        });
      } catch (error) {
        // If user creation fails, might already exist
        // This is simplified - production would have proper login endpoint
        throw error;
      }

      uiStore.showToast('Welcome back! 🎮', 'success');
    }

    // Redirect to intended page or dashboard
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch (error) {
    console.error('Authentication error:', error);
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Authentication failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

// Quick start with demo account
const handleQuickStart = async () => {
  const demoUsername = `demo_${Date.now()}`;

  form.value.username = demoUsername;
  form.value.email = `${demoUsername}@demo.com`;
  form.value.password = 'demo1234';

  isRegistering.value = true;
  await handleSubmit();
};
</script>
