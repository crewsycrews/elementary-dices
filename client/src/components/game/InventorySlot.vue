<template>
  <div
    class="inventory-slot relative rounded-lg border-2 overflow-hidden transition-all duration-200"
    :class="[
      slotClasses,
      {
        'cursor-pointer hover:shadow-lg hover:scale-105': isInteractive,
        'opacity-50': isEmpty,
        'ring-4 ring-primary': isSelected
      }
    ]"
    @click="handleClick"
  >
    <!-- Empty State -->
    <div
      v-if="isEmpty"
      class="aspect-square bg-muted/30 flex items-center justify-center"
    >
      <div class="text-4xl text-muted-foreground">{{ emptyIcon }}</div>
    </div>

    <!-- Item Display -->
    <div v-else class="relative">
      <!-- Quantity Badge (for items) -->
      <div
        v-if="item && quantity !== undefined && quantity > 1"
        class="absolute top-2 right-2 z-10 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold"
      >
        ×{{ quantity }}
      </div>

      <!-- Equipped Badge (for dice) -->
      <div
        v-if="dice && isEquipped"
        class="absolute top-2 left-2 z-10 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold"
      >
        ⚡ Equipped
      </div>

      <!-- Rarity Badge -->
      <div
        v-if="rarity"
        class="absolute bottom-2 right-2 z-10 text-xs px-2 py-1 rounded font-bold"
        :class="rarityBadgeClass"
      >
        {{ rarity }}
      </div>

      <!-- Icon/Image -->
      <div
        class="aspect-square flex items-center justify-center p-4"
        :class="backgroundClass"
      >
        <div class="text-6xl">{{ displayIcon }}</div>
      </div>

      <!-- Content -->
      <div class="p-3 space-y-1">
        <h4 class="font-bold text-sm truncate">{{ displayName }}</h4>
        <p class="text-xs text-muted-foreground line-clamp-2">{{ displayDescription }}</p>

        <!-- Item Type Badge -->
        <div v-if="item" class="flex gap-1 flex-wrap">
          <span class="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {{ item.item_type }}
          </span>
          <span v-if="item.is_consumable" class="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-700">
            Consumable
          </span>
        </div>

        <!-- Dice Notation -->
        <div v-if="dice" class="text-xs font-mono font-bold text-primary">
          {{ diceType?.dice_notation }}
        </div>

        <!-- Price (if in shop) -->
        <div v-if="showPrice && price !== undefined" class="flex items-center gap-1 text-sm font-bold text-yellow-600">
          <span>💰</span>
          <span>{{ price }}</span>
        </div>
      </div>

      <!-- Slot for action buttons -->
      <div v-if="$slots.actions" class="p-2 border-t border-muted">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ItemSchema, DiceTypeSchema, PlayerInventorySchema, PlayerDiceSchema } from '@elementary-dices/shared/schemas';

interface Props {
  // For items
  item?: typeof ItemSchema.static;
  quantity?: number;

  // For dice
  dice?: typeof PlayerDiceSchema.static;
  diceType?: typeof DiceTypeSchema.static;
  isEquipped?: boolean;

  // Common props
  isInteractive?: boolean;
  isSelected?: boolean;
  showPrice?: boolean;
  emptyIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isInteractive: true,
  isSelected: false,
  showPrice: false,
  emptyIcon: '📦',
});

const emit = defineEmits<{
  click: [];
  use: [];
  equip: [];
  purchase: [];
}>();

// Computed properties
const isEmpty = computed(() => !props.item && !props.dice);

const displayName = computed(() => {
  if (props.item) return props.item.name;
  if (props.diceType) return props.diceType.name;
  return '';
});

const displayDescription = computed(() => {
  if (props.item) return props.item.description;
  if (props.diceType) return props.diceType.description;
  return '';
});

const displayIcon = computed(() => {
  if (props.item) {
    // Icons based on item type
    const icons: Record<string, string> = {
      capture: '🎯',
      consumable: '🧪',
      buff: '✨',
    };
    return icons[props.item.item_type] || '📦';
  }
  if (props.dice) {
    return '🎲';
  }
  return props.emptyIcon;
});

const rarity = computed(() => {
  if (props.item) return props.item.rarity;
  if (props.diceType) return props.diceType.rarity;
  return null;
});

const price = computed(() => {
  if (props.item) return props.item.price;
  if (props.diceType) return props.diceType.price;
  return undefined;
});

// Styling classes
const slotClasses = computed(() => {
  if (isEmpty.value) {
    return 'border-dashed border-muted';
  }

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

  return rarity.value ? rarityColors[rarity.value] : 'border-gray-400';
});

const backgroundClass = computed(() => {
  if (isEmpty.value) return 'bg-muted/30';

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

  return rarity.value ? rarityBgs[rarity.value] : 'bg-muted/30';
});

const rarityBadgeClass = computed(() => {
  const rarityColors: Record<string, string> = {
    common: 'bg-gray-500/20 text-gray-700',
    rare: 'bg-blue-500/20 text-blue-700',
    epic: 'bg-purple-500/20 text-purple-700',
    legendary: 'bg-yellow-500/20 text-yellow-700',
    green: 'bg-green-500/20 text-green-700',
    blue: 'bg-blue-500/20 text-blue-700',
    purple: 'bg-purple-500/20 text-purple-700',
    gold: 'bg-yellow-500/20 text-yellow-700',
  };

  return rarity.value ? rarityColors[rarity.value] : 'bg-gray-500/20 text-gray-700';
});

// Event handlers
const handleClick = () => {
  if (isEmpty.value || !props.isInteractive) return;
  emit('click');
};
</script>

<style scoped>
.inventory-slot {
  min-width: 150px;
}
</style>
