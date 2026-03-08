<template>
  <div
    class="shop-card rounded-lg border-2 overflow-hidden transition-all duration-200 hover:shadow-xl relative"
    :class="[cardBorderClass, { 'opacity-50 cursor-not-allowed': !canAfford }]"
  >
    <!-- Rarity Badge -->
    <div class="absolute top-2 right-2 z-10">
      <span
        class="text-xs px-2 py-1 rounded font-bold"
        :class="rarityBadgeClass"
      >
        {{ dice.rarity }}
      </span>
    </div>

    <!-- Dice Display -->
    <div class="relative">
      <div
        class="aspect-square flex items-center justify-center p-4"
        :class="backgroundClass"
      >
        <Dice3D
          :dice-type="dice.dice_notation"
          :value="1"
          :scale="0.7"
          :show-shadow="false"
          :affinity="dice.faces?.[0]"
          :element-faces="dice.faces"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-3">
      <!-- Name -->
      <div>
        <h3 class="font-bold text-lg truncate">{{ dice.name }}</h3>
      </div>

      <!-- Faces -->
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Faces:</span>
          <span class="font-bold">
            <span v-for="(face, idx) in dice.faces" :key="idx" :title="face">{{ ELEMENT_EMOJI[face] || face }}</span>
          </span>
        </div>
      </div>

      <!-- Price and Purchase -->
      <div class="flex items-center justify-between pt-3 border-t border-muted">
        <div class="flex items-center gap-2">
          <span class="text-2xl">💰</span>
          <div>
            <div
              class="font-bold text-xl"
              :class="{ 'text-red-600': !canAfford }"
            >
              {{ dice.price }}
            </div>
          </div>
        </div>

        <button
          @click="handlePurchase"
          :disabled="!canAfford || isPurchasing"
          class="px-4 py-2 rounded-lg font-bold transition-all"
          :class="[
            canAfford && !isPurchasing
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          ]"
        >
          {{ isPurchasing ? "Buying..." : "Buy" }}
        </button>
      </div>

      <!-- Insufficient Funds Warning -->
      <div v-if="!canAfford" class="text-xs text-red-600 text-center">
        You need {{ dice.price - playerCurrency }} more currency
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Dice3D from "./Dice3D.vue";
import type { DiceType } from "./dice-geometry";

const ELEMENT_EMOJI: Record<string, string> = {
  fire: '\uD83D\uDD25',
  water: '\uD83C\uDF0A',
  air: '\uD83D\uDCA8',
  earth: '\u26F0\uFE0F',
  lightning: '\u26A1',
};

interface SimplifiedDice {
  id: string;
  name: string;
  price: number;
  rarity: string;
  dice_notation: DiceType;
  faces: ("fire" | "water" | "earth" | "air" | "lightning")[];
}

interface Props {
  dice: SimplifiedDice;
  playerCurrency: number;
  isPurchasing?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isPurchasing: false,
});
const emit = defineEmits<{
  purchase: [];
}>();

// Computed properties
const canAfford = computed(() => props.playerCurrency >= props.dice.price);

// Styling
const cardBorderClass = computed(() => {
  const rarityColors: Record<string, string> = {
    common: "border-green-500",
    rare: "border-blue-500",
    epic: "border-purple-500",
    legendary: "border-yellow-500",
  };

  return rarityColors[props.dice.rarity] || "border-gray-400";
});

const backgroundClass = computed(() => {
  const rarityBgs: Record<string, string> = {
    common: "bg-green-500/10",
    rare: "bg-blue-500/10",
    epic: "bg-purple-500/10",
    legendary: "bg-gradient-to-br from-yellow-400/20 to-orange-500/20",
  };

  return rarityBgs[props.dice.rarity] || "bg-muted/10";
});

const rarityBadgeClass = computed(() => {
  const rarityColors: Record<string, string> = {
    common: "bg-green-500 text-white",
    rare: "bg-blue-500 text-white",
    epic: "bg-purple-500 text-white",
    legendary: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
  };

  return rarityColors[props.dice.rarity] || "bg-gray-500 text-white";
});

// Event handlers
const handlePurchase = () => {
  if (canAfford.value && !props.isPurchasing) {
    emit("purchase");
  }
};
</script>

<style scoped>
.shop-card {
  min-width: 250px;
}
</style>
