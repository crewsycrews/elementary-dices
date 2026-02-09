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
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="dice in diceOfSelectedType"
            :key="dice.id"
            class="p-6 rounded-lg border-2 transition-all cursor-pointer"
            :class="
              dice.is_equipped
                ? 'border-primary bg-primary/10 shadow-lg'
                : 'border-border bg-card hover:border-primary hover:bg-muted'
            "
            @click="handleEquipDice(dice)"
          >
            <!-- Dice Header -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <span class="text-3xl">🎲</span>
                <div>
                  <h3 class="font-bold text-lg">{{ dice.dice_type?.dice_notation?.toUpperCase() }}</h3>
                  <p class="text-sm text-muted-foreground">{{ dice.dice_type?.name }}</p>
                </div>
              </div>
              <div
                v-if="dice.is_equipped"
                class="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold"
              >
                ✓ Equipped
              </div>
            </div>
  
            <!-- Rarity Badge -->
            <div class="mb-3">
              <span
                class="px-3 py-1 rounded-full text-xs font-bold"
                :class="getRarityClass(dice.dice_type?.rarity)"
              >
                {{ dice.dice_type?.rarity?.toUpperCase() }}
              </span>
            </div>
  
            <!-- Stats -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Bonus Multiplier:</span>
                <span class="font-bold">{{ dice.dice_type?.stat_bonuses?.bonus_multiplier || 1 }}x</span>
              </div>
              <div v-if="dice.dice_type?.stat_bonuses?.element_affinity" class="flex justify-between">
                <span class="text-muted-foreground">Element Affinity:</span>
                <span class="font-bold capitalize">
                  {{ dice.dice_type?.stat_bonuses?.element_affinity }}
                </span>
              </div>
            </div>
  
            <!-- Description -->
            <p class="text-xs text-muted-foreground mt-3 line-clamp-2">
              {{ dice.dice_type?.description || 'A standard dice for rolling outcomes.' }}
            </p>
  
            <!-- Action Button -->
            <button
              v-if="!dice.is_equipped"
              @click.stop="handleEquipDice(dice)"
              class="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
            >
              Equip
            </button>
            <button
              v-else
              @click.stop="handleUnequipDice(dice)"
              class="w-full mt-4 px-4 py-2 border-2 border-border rounded-lg font-bold hover:bg-muted transition-all"
            >
              Unequip
            </button>
          </div>
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

// Get rarity class
const getRarityClass = (rarity?: string) => {
  switch (rarity) {
    case 'green':
      return 'bg-green-500/20 text-green-600';
    case 'blue':
      return 'bg-blue-500/20 text-blue-600';
    case 'purple':
      return 'bg-purple-500/20 text-purple-600';
    case 'gold':
      return 'bg-yellow-500/20 text-yellow-600';
    default:
      return 'bg-gray-500/20 text-gray-600';
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
