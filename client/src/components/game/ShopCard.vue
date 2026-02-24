<template>
  <div
    class="shop-card rounded-lg border-2 overflow-hidden transition-all duration-200 hover:shadow-xl"
    :class="[
      cardBorderClass,
      { 'opacity-50 cursor-not-allowed': !canAfford }
    ]"
  >
    <!-- Rarity Badge -->
    <div class="absolute top-2 right-2 z-10">
      <span
        class="text-xs px-2 py-1 rounded font-bold"
        :class="rarityBadgeClass"
      >
        {{ rarity }}
      </span>
    </div>

    <!-- "New" or "Sale" Badge -->
    <div v-if="badge" class="absolute top-2 left-2 z-10">
      <span
        class="text-xs px-2 py-1 rounded font-bold animate-pulse"
        :class="badgeClass"
      >
        {{ badge }}
      </span>
    </div>

    <!-- Item/Dice Display -->
    <div class="relative">
      <div
        class="aspect-square flex items-center justify-center p-8"
        :class="backgroundClass"
      >
        <div class="text-7xl drop-shadow-lg">{{ icon }}</div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-3">
      <!-- Name and Type -->
      <div>
        <h3 class="font-bold text-lg truncate">{{ name }}</h3>
        <div class="flex items-center gap-2 mt-1">
          <span
            v-if="type"
            class="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
          >
            {{ type }}
          </span>
          <span
            v-if="diceNotation"
            class="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold"
          >
            {{ diceNotation }}
          </span>
        </div>
      </div>

      <!-- Description -->
      <p class="text-sm text-muted-foreground line-clamp-3">
        {{ description }}
      </p>

      <!-- Special Effects -->
      <div v-if="effects && effects.length > 0" class="space-y-1">
        <div class="text-xs font-semibold text-muted-foreground">Effects:</div>
        <ul class="text-xs space-y-0.5">
          <li
            v-for="(effect, index) in effects"
            :key="index"
            class="flex items-start gap-1"
          >
            <span class="text-green-600">✓</span>
            <span>{{ effect }}</span>
          </li>
        </ul>
      </div>

      <!-- Price and Purchase -->
      <div class="flex items-center justify-between pt-3 border-t border-muted">
        <div class="flex items-center gap-2">
          <span class="text-2xl">💰</span>
          <div>
            <div class="font-bold text-xl" :class="{ 'text-red-600': !canAfford }">
              {{ price }}
            </div>
            <div v-if="originalPrice && originalPrice > price" class="text-xs text-muted-foreground line-through">
              {{ originalPrice }}
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
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          ]"
        >
          {{ isPurchasing ? 'Buying...' : 'Buy' }}
        </button>
      </div>

      <!-- Insufficient Funds Warning -->
      <div v-if="!canAfford" class="text-xs text-red-600 text-center">
        You need {{ price - playerCurrency }} more currency
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ItemSchema, DiceTypeSchema } from '@elementary-dices/shared/schemas';

interface Props {
  // For items
  item?: typeof ItemSchema.static;

  // For dice
  diceType?: typeof DiceTypeSchema.static;

  // Player currency for affordability check
  playerCurrency: number;

  // State
  isPurchasing?: boolean;

  // Optional UI enhancements
  badge?: 'New' | 'Sale' | string;
  originalPrice?: number; // For showing discounts
}

const props = withDefaults(defineProps<Props>(), {
  isPurchasing: false,
});

const emit = defineEmits<{
  purchase: [];
}>();

// Computed properties
const name = computed(() => {
  if (props.item) return props.item.name;
  if (props.diceType) return props.diceType.name;
  return '';
});

const description = computed(() => {
  if (props.item) return props.item.description;
  if (props.diceType) return props.diceType.description;
  return '';
});

const price = computed(() => {
  if (props.item) return props.item.price;
  if (props.diceType) return props.diceType.price;
  return 0;
});

const rarity = computed(() => {
  if (props.item) return props.item.rarity;
  if (props.diceType) return props.diceType.rarity;
  return 'common';
});

const type = computed(() => {
  if (props.item) return props.item.item_type;
  return null;
});

const diceNotation = computed(() => {
  if (props.diceType) return props.diceType.dice_notation;
  return null;
});

const icon = computed(() => {
  if (props.item) {
    const icons: Record<string, string> = {
      capture: '🎯',
      consumable: '🧪',
      buff: '✨',
    };
    return icons[props.item.item_type] || '📦';
  }
  if (props.diceType) {
    return '🎲';
  }
  return '📦';
});

// Get effect descriptions
const effects = computed(() => {
  const effectList: string[] = [];

  if (props.item?.effect) {
    if (props.item.effect.capture_bonus) {
      effectList.push(`+${props.item.effect.capture_bonus}% capture rate`);
    }
    if (props.item.effect.duration) {
      effectList.push(`Lasts ${props.item.effect.duration} turns`);
    }
  }

  if (props.diceType?.faces && props.diceType.faces.length > 0) {
    const uniqueElements = [...new Set(props.diceType.faces)];
    effectList.push(`Elements: ${uniqueElements.join(', ')}`);
  }

  return effectList;
});

const canAfford = computed(() => props.playerCurrency >= price.value);

// Styling
const cardBorderClass = computed(() => {
  const rarityColors: Record<string, string> = {
    common: 'border-gray-400',
    rare: 'border-blue-500',
    epic: 'border-purple-500',
    legendary: 'border-yellow-500',
    green: 'border-green-500',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    gold: 'border-yellow-500',
  };

  return rarityColors[rarity.value] || 'border-gray-400';
});

const backgroundClass = computed(() => {
  const rarityBgs: Record<string, string> = {
    common: 'bg-gray-500/10',
    rare: 'bg-blue-500/10',
    epic: 'bg-purple-500/10',
    legendary: 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20',
    green: 'bg-green-500/10',
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10',
    gold: 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20',
  };

  return rarityBgs[rarity.value] || 'bg-muted/10';
});

const rarityBadgeClass = computed(() => {
  const rarityColors: Record<string, string> = {
    common: 'bg-gray-500 text-white',
    rare: 'bg-blue-500 text-white',
    epic: 'bg-purple-500 text-white',
    legendary: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
    green: 'bg-green-500 text-white',
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
    gold: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
  };

  return rarityColors[rarity.value] || 'bg-gray-500 text-white';
});

const badgeClass = computed(() => {
  if (props.badge === 'New') {
    return 'bg-green-600 text-white';
  }
  if (props.badge === 'Sale') {
    return 'bg-red-600 text-white';
  }
  return 'bg-primary text-primary-foreground';
});

// Event handlers
const handlePurchase = () => {
  if (canAfford.value && !props.isPurchasing) {
    emit('purchase');
  }
};
</script>

<style scoped>
.shop-card {
  min-width: 250px;
}
</style>
