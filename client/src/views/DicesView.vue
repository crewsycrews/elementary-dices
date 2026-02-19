<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Back Button -->
    <button
      @click="$router.push('/')"
      class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span class="text-xl">←</span>
      <span class="font-semibold">Back</span>
    </button>

    <!-- Header -->
    <div class="text-center">
      <h1 class="text-3xl font-bold mb-2">🎲 Dice Collection</h1>
      <p class="text-muted-foreground">
        Manage and equip your dice for events and battles
      </p>
    </div>

    <!-- Hand Dice Selector -->
    <div class="flex justify-center items-center py-8">
      <HandDiceSelector
        :selected-dice-type="selectedDiceType"
        @select="handleDiceTypeSelect"
      />
      <!-- Selected Dice Details -->
      <div v-if="selectedDiceType && selectedDiceDetails" class="flex flex-col content-center w-1/2 max-w-4xl mx-auto space-y-6">
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-2">{{ selectedDiceType.toUpperCase() }} Collection</h2>
          <p class="text-muted-foreground">
            {{ diceOfSelectedType.length }} {{ selectedDiceType }} dice owned
          </p>
        </div>
  
        <!-- Dice Grid -->
        <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <DiceCard
            v-for="dice in diceOfSelectedType"
            :key="dice.id"
            :dice="dice"
            @equip="handleEquipDice(dice)"
            @unequip="handleUnequipDice(dice)"
          />
        </div>
  
        <!-- Empty State -->
        <div v-if="diceOfSelectedType.length === 0" class="p-12 border-2 border-dashed rounded-lg text-center">
          <div class="text-6xl mb-4">🎲</div>
          <h3 class="text-xl font-bold mb-2">No {{ selectedDiceType.toUpperCase() }} Dice</h3>
          <p class="text-muted-foreground mb-4">
            Purchase {{ selectedDiceType }} dice from merchants during events
          </p>
        </div>
      </div>
    </div>


    <!-- Instructions -->
    <div class="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
      <p>
        💡 <strong>Tip:</strong> Equip different dice types to adapt your strategy for various challenges.
        Higher rarity dice provide better bonuses!
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useInventoryStore } from '@/stores/inventory';
import { useUIStore } from '@/stores/ui';
import HandDiceSelector from '@/components/game/HandDiceSelector.vue';
import DiceCard from '@/components/game/DiceCard.vue';

const userStore = useUserStore();
const inventoryStore = useInventoryStore();
const uiStore = useUIStore();

const selectedDiceType = ref<string | null>(null);

// Get dice of selected type
const diceOfSelectedType = computed(() => {
  if (!selectedDiceType.value) return [];
  return inventoryStore.playerDice.filter(
    (dice) => dice.dice_type?.dice_notation === selectedDiceType.value
  );
});

// Selected dice details
const selectedDiceDetails = computed(() => {
  if (!selectedDiceType.value || diceOfSelectedType.value.length === 0) return null;
  return diceOfSelectedType.value[0].dice_type;
});

// Handle dice type selection
const handleDiceTypeSelect = (diceType: string) => {
  selectedDiceType.value = diceType;
};

// Handle equip dice
const handleEquipDice = async (dice: any) => {
  if (!userStore.userId || dice.is_equipped) return;

  try {
    await inventoryStore.equipDice(userStore.userId, dice.id);
    uiStore.showToast(
      `${dice.dice_type?.dice_notation?.toUpperCase()} equipped!`,
      'success'
    );
  } catch (error) {
    console.error('Failed to equip dice:', error);
    uiStore.showToast('Failed to equip dice', 'error');
  }
};

// Handle unequip dice
const handleUnequipDice = async (dice: any) => {
  if (!userStore.userId || !dice.is_equipped) return;

  try {
    // Note: You may need to add an unequip endpoint
    // For now, just show a message
    uiStore.showToast(
      'Dice is currently equipped. Equip another dice to replace it.',
      'info'
    );
  } catch (error) {
    console.error('Failed to unequip dice:', error);
  }
};

// Load data on mount
onMounted(async () => {
  if (!userStore.userId) return;

  try {
    await inventoryStore.fetchPlayerDice(userStore.userId);
    // Auto-select d6 if available
    const hasD6 = inventoryStore.playerDice.some(
      (dice) => dice.dice_type?.dice_notation === 'd6'
    );
    if (hasD6) {
      selectedDiceType.value = 'd6';
    }
  } catch (error) {
    console.error('Failed to load dice:', error);
  }
});
</script>
