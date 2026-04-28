<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4"
  >
    <div class="w-full max-w-md space-y-6">
      <div class="flex justify-between gap-3">
        <RouterLink
          to="/"
          class="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ t("login.back_home") }}
        </RouterLink>
      </div>

      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-4xl font-bold">🎲 Elementary Dice</h1>
        <p class="text-muted-foreground">
          {{
            isRegistering
              ? t("login.subtitle_register")
              : t("login.subtitle_login")
          }}
        </p>
      </div>

      <!-- Login/Register Form -->
      <div class="p-6 border-2 rounded-lg bg-card shadow-xl space-y-4">
        <!-- Mode Toggle -->
        <div class="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            @click="isRegistering = false"
            class="flex-1 py-2 px-4 rounded font-semibold transition-all"
            :class="
              !isRegistering
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
          >
            {{ t("login.tab_login") }}
          </button>
          <button
            @click="isRegistering = true"
            class="flex-1 py-2 px-4 rounded font-semibold transition-all"
            :class="
              isRegistering
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
          >
            {{ t("login.tab_register") }}
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Username -->
          <div class="space-y-2">
            <label for="username" class="block text-sm font-semibold">
              {{ t("login.username") }}
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              required
              minlength="3"
              maxlength="20"
              :placeholder="t('login.username_placeholder')"
              class="w-full px-4 py-2 rounded-lg border-2 bg-background border-border focus:border-primary focus:outline-none transition-colors"
              :disabled="isLoading"
            />
            <p class="text-xs text-muted-foreground">{{ t("login.username_hint") }}</p>
          </div>

          <!-- Email (only for registration) -->
          <div v-if="isRegistering" class="space-y-2">
            <label for="email" class="block text-sm font-semibold">
              {{ t("login.email") }}
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              :placeholder="t('login.email_placeholder')"
              class="w-full px-4 py-2 rounded-lg border-2 bg-background border-border focus:border-primary focus:outline-none transition-colors"
              :disabled="isLoading"
            />
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-semibold">
              {{ t("login.password") }}
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              :minlength="isRegistering ? 8 : undefined"
              :placeholder="t('login.password_placeholder')"
              class="w-full px-4 py-2 rounded-lg border-2 bg-background border-border focus:border-primary focus:outline-none transition-colors"
              :disabled="isLoading"
            />
            <p v-if="isRegistering" class="text-xs text-muted-foreground">
              {{ t("login.password_hint") }}
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
            {{
              isLoading
                ? t("login.processing")
                : isRegistering
                  ? `🎮 ${t("login.start_adventure")}`
                  : `🔓 ${t("login.tab_login")}`
            }}
          </button>
        </form>

        <!-- Divider -->
        <div class="flex items-center gap-3">
          <div class="flex-1 h-px bg-border"></div>
          <span class="text-xs text-muted-foreground font-semibold">{{ t("login.or") }}</span>
          <div class="flex-1 h-px bg-border"></div>
        </div>

        <!-- Google Sign-In Button -->
        <button
          @click="handleGoogleLogin"
          :disabled="isLoading"
          class="w-full py-3 px-4 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {{ t("login.continue_google") }}
        </button>

        <!-- Help Text -->
        <div class="text-center text-sm text-muted-foreground">
          <p v-if="!isRegistering">
            {{ t("login.no_account") }}
            <button
              @click="isRegistering = true"
              class="text-primary font-semibold hover:underline"
            >
              {{ t("login.register_here") }}
            </button>
          </p>
          <p v-else>
            {{ t("login.have_account") }}
            <button
              @click="isRegistering = false"
              class="text-primary font-semibold hover:underline"
            >
              {{ t("login.login_here") }}
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
          {{ t("login.quick_start") }}
        </button>
      </div>

      <PublicLegalLinks />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { RouterLink, useRouter, useRoute } from "vue-router";
import PublicLegalLinks from "@/components/layout/PublicLegalLinks.vue";
import { useUserStore } from "@/stores/user";
import { useUIStore } from "@/stores/ui";
import { useI18n } from "@/i18n";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const uiStore = useUIStore();
const { t } = useI18n();

const isRegistering = ref(false);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const form = ref({
  username: "",
  email: "",
  password: "",
});

const syncModeFromRoute = () => {
  isRegistering.value = route.query.mode === "register";
};

// Check for OAuth callback on mount
onMounted(async () => {
  syncModeFromRoute();
  const authStatus = route.query.auth as string;
  const authError = route.query.error as string;

  if (authStatus === "success") {
    isLoading.value = true;
    try {
      await userStore.handleOAuthCallback();
      uiStore.showToast(t("login.toast_google_success"), "success");

      // Redirect to intended page or dashboard
      const redirect = (route.query.redirect as string) || "/menu";
      router.push(redirect);
    } catch (error) {
      console.error("OAuth callback error:", error);
      errorMessage.value = t("login.error_google_complete");
    } finally {
      isLoading.value = false;
    }
  } else if (authError === "oauth_failed") {
    errorMessage.value = t("login.error_google_failed");
  }
});

watch(() => route.query.mode, syncModeFromRoute);

// Handle form submission
const handleSubmit = async () => {
  errorMessage.value = null;
  isLoading.value = true;

  try {
    if (isRegistering.value) {
      // Registration
      if (!form.value.email) {
        errorMessage.value = t("login.error_email_required");
        return;
      }

      await userStore.createUser({
        username: form.value.username,
        email: form.value.email,
        password: form.value.password,
      });

      uiStore.showToast(t("login.toast_register_success"), "success");
    } else {
      // Login - call proper login endpoint
      await userStore.loginUser({
        username: form.value.username,
        password: form.value.password,
      });

      uiStore.showToast(t("login.toast_login_success"), "success");
    }

    // Redirect to intended page or dashboard
    const redirect = (route.query.redirect as string) || "/menu";
    router.push(redirect);
  } catch (error) {
    console.error("Authentication error:", error);
    errorMessage.value =
      error instanceof Error
        ? error.message
        : t("login.error_auth_failed");
  } finally {
    isLoading.value = false;
  }
};

// Handle Google OAuth login
const handleGoogleLogin = () => {
  errorMessage.value = null;
  userStore.loginWithGoogle();
};

// Quick start with demo account
const handleQuickStart = async () => {
  const demoUsername = `demo_${Date.now()}`;

  form.value.username = demoUsername;
  form.value.email = `${demoUsername}@demo.com`;
  form.value.password = "demo1234";

  isRegistering.value = true;
  await handleSubmit();
};
</script>
