<template>
  <div class="space-y-4 flex flex-row">
    <div class="relative w-fit mx-auto">
      <HandDiceSelector
        :selected-dice-type="selectedDiceType"
        :disabled="disabled"
        @select="handleDiceTypeSelect"
      />
      <slot name="hand-center" />
    </div>

    <div
      v-if="selectedDiceType"
      class="w-full max-w-4xl mx-auto space-y-4"
      :class="detailsContainerClass"
    >
      <div class="text-center">
        <h2 class="text-xl font-bold">{{ selectedDiceType.toUpperCase() }} Collection</h2>
        <p class="text-sm text-muted-foreground">
          {{ diceOfSelectedType.length }} {{ selectedDiceType }} dice owned
        </p>
      </div>

      <div v-if="diceOfSelectedType.length > 0" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <DiceCard
          v-for="dice in diceOfSelectedType"
          :key="dice.id"
          :dice="dice"
          @equip="handleEquipDice(dice)"
          @unequip="handleUnequipDice(dice)"
        />
      </div>

      <div
        v-else
        class="p-8 border-2 border-dashed rounded-lg text-center"
      >
        <h3 class="text-lg font-bold mb-2">No {{ selectedDiceType.toUpperCase() }} Dice</h3>
        <p class="text-muted-foreground text-sm">
          Purchase {{ selectedDiceType }} dice from merchants during events.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useUserStore } from "@/stores/user";
import { useInventoryStore } from "@/stores/inventory";
import { useUIStore } from "@/stores/ui";
import HandDiceSelector from "@/components/game/HandDiceSelector.vue";
import DiceCard from "@/components/game/DiceCard.vue";

interface Props {
  disabled?: boolean;
  detailsContainerClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  detailsContainerClass: "",
});

const inventoryStore = useInventoryStore();
const userStore = useUserStore();
const uiStore = useUIStore();

const selectedDiceType = ref<string | null>(null);

const diceOfSelectedType = computed(() => {
  if (!selectedDiceType.value) return [];
  return inventoryStore.playerDice.filter(
    (dice) => dice.dice_type?.dice_notation === selectedDiceType.value,
  );
});

const handleDiceTypeSelect = (diceType: string) => {
  selectedDiceType.value = diceType;
};

const handleEquipDice = async (dice: any) => {
  if (!userStore.userId || dice.is_equipped) return;
  try {
    await inventoryStore.equipDice(userStore.userId, dice.id);
    uiStore.showToast(`${dice.dice_type?.dice_notation?.toUpperCase()} equipped!`, "success");
  } catch (error) {
    console.error("Failed to equip dice:", error);
    uiStore.showToast("Failed to equip dice", "error");
  }
};

const handleUnequipDice = async (dice: any) => {
  if (!dice.is_equipped) return;
  uiStore.showToast("Dice is currently equipped. Equip another dice to replace it.", "info");
};

watch(
  () => inventoryStore.playerDice,
  (playerDice) => {
    if (selectedDiceType.value) {
      return;
    }

    const hasD6 = playerDice.some((dice) => dice.dice_type?.dice_notation === "d6");
    if (hasD6) {
      selectedDiceType.value = "d6";
    }
  },
  { immediate: true, deep: true },
);
</script>
