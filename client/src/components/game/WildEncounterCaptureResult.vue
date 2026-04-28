<template>
  <div
    class="p-6 rounded-lg"
    :class="
      success
        ? 'bg-green-500/10 border-2 border-green-500'
        : 'bg-red-500/10 border-2 border-red-500'
    "
  >
    <h2 class="text-2xl font-bold mb-2">
      {{ success ? successTitle : failureTitle }}
    </h2>
    <p class="text-lg mb-2">{{ message }}</p>

    <div
      v-if="elementalCaught"
      class="mt-4 p-4 bg-background/50 rounded-lg"
    >
      <p class="font-bold text-xl">
        {{ elementalCaught.name }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ levelLabel(elementalCaught.level) }}
      </p>
    </div>

    <button
      @click="$emit('proceed')"
      class="w-full mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
    >
      {{ proceedLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  success: boolean;
  message: string;
  elementalCaught: { name: string; level: number } | null;
  successTitle: string;
  failureTitle: string;
  proceedLabel: string;
  levelLabel: (level: number) => string;
}>();

defineEmits<{
  proceed: [];
}>();
</script>
