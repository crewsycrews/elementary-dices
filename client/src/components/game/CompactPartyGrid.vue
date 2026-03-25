<template>
  <div class="compact-party-grid">
    <!-- Label (optional) -->
    <h3 v-if="label" class="text-lg font-bold text-foreground mb-3 text-center">
      {{ label }}
    </h3>

    <!-- 3+2 Grid Layout -->
    <div class="space-y-3">
      <!-- Top Row: 3 slots -->
      <div class="grid grid-cols-3 gap-3">
        <div v-for="index in 3" :key="`slot-${index - 1}`" class="party-slot">
          <PartyCard
            v-if="party[index - 1]"
            :elemental="party[index - 1]"
            :show-actions="showActions"
            @click="$emit('select', party[index - 1])"
          />
          <EmptyCard v-else :slot-number="index" />
        </div>
      </div>

      <!-- Bottom Row: 2 slots (centered) -->
      <div class="grid grid-cols-3 gap-3">
        <div class="col-start-1 party-slot">
          <PartyCard
            v-if="party[3]"
            :elemental="party[3]"
            :show-actions="showActions"
            @click="$emit('select', party[3])"
          />
          <EmptyCard v-else :slot-number="4" />
        </div>
        <div class="col-start-3 party-slot">
          <PartyCard
            v-if="party[4]"
            :elemental="party[4]"
            :show-actions="showActions"
            @click="$emit('select', party[4])"
          />
          <EmptyCard v-else :slot-number="5" />
        </div>
      </div>
    </div>

    <!-- Stats Summary (optional) -->
    <div
      v-if="showStats"
      class="mt-4 text-center text-sm text-muted-foreground"
    >
      <span class="font-semibold">{{ t("party.total_power") }}:</span> {{ totalPower }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PlayerElemental } from "@elementary-dices/shared";
import PartyCard from "./PartyCard.vue";
import EmptyCard from "./EmptyCard.vue";
import { useI18n } from "@/i18n";

export interface CompactPartyGridProps {
  party?: (PlayerElemental | null)[];
  label?: string;
  showActions?: boolean;
  showStats?: boolean;
}

const props = withDefaults(defineProps<CompactPartyGridProps>(), {
  party: () => [],
  label: "",
  showActions: false,
  showStats: false,
});

const emit = defineEmits<{
  select: [elemental: PlayerElemental];
}>();
const { t } = useI18n();

// Helper to calculate power from stats
const calculatePower = (el: PlayerElemental | null) => {
  if (!el) return 0;
  const stats = el.current_stats;
  return stats.health + stats.attack + stats.defense + stats.speed;
};

const totalPower = computed(() => {
  return props.party.reduce((sum, el) => sum + calculatePower(el), 0);
});
</script>

<style scoped>
.party-slot {
  min-width: 0; /* Allow grid items to shrink */
}

@media (max-width: 640px) {
  .compact-party-grid {
    font-size: 0.875rem;
  }
}
</style>
