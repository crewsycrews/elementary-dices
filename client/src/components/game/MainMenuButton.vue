<template>
  <button
    class="main-menu-button relative p-6 md:p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    :disabled="disabled"
    :class="[
      isActive
        ? 'border-primary bg-primary/10 shadow-lg'
        : disabled
          ? 'border-border bg-card'
          : 'border-border bg-card hover:bg-muted hover:border-primary',
    ]"
    @click="$emit('click')"
  >
    <!-- Badge (optional) -->
    <div
      v-if="badge !== undefined && badge > 0"
      class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-sm font-bold shadow-lg"
    >
      {{ badge > 99 ? '99+' : badge }}
    </div>

    <!-- Content -->
    <div class="flex flex-col items-center gap-3">
      <!-- Icon -->
      <div class="text-4xl md:text-5xl" :class="iconColor">
        {{ icon }}
      </div>

      <!-- Title -->
      <h3 class="text-lg md:text-xl font-bold text-foreground">
        {{ title }}
      </h3>

      <!-- Subtitle (optional) -->
      <p v-if="subtitle" class="text-xs md:text-sm text-muted-foreground text-center">
        {{ subtitle }}
      </p>
    </div>

    <!-- Pulse effect for active event -->
    <div
      v-if="isActive && pulse"
      class="absolute inset-0 rounded-2xl border-2 border-primary animate-ping opacity-20"
    ></div>
  </button>
</template>

<script setup lang="ts">
interface Props {
  title: string
  icon: string
  subtitle?: string
  badge?: number
  iconColor?: string
  isActive?: boolean
  pulse?: boolean
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  badge: undefined,
  iconColor: 'text-primary',
  isActive: false,
  pulse: false,
  disabled: false,
})

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.main-menu-button {
  min-height: 120px;
  min-width: 180px;
}

@media (min-width: 768px) {
  .main-menu-button {
    min-height: 160px;
    min-width: 220px;
  }
}

.main-menu-button:hover {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}
</style>
