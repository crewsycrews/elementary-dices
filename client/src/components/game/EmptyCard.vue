<template>
  <div
    class="empty-card p-3 rounded-lg border-2 border-dashed border-border bg-muted/30"
  >
    <div
      class="aspect-square rounded-lg bg-muted/50 mb-2 flex items-center justify-center"
    >
      <span class="text-4xl text-muted-foreground opacity-50">+</span>
    </div>
    <div class="text-center">
      <p class="text-xs text-muted-foreground">Empty Slot</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface EmptyCardProps {
  slotNumber: number;
}

defineProps<EmptyCardProps>();
</script>

<style scoped>
.empty-card {
  opacity: 0.6;
}

.empty-card:hover {
  opacity: 0.8;
}
</style>
