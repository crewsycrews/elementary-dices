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
        <h2 class="text-xl font-bold">{{ t("dice_inventory.collection", { type: selectedDiceType.toUpperCase() }) }}</h2>
        <p class="text-sm text-muted-foreground">
          {{ t("dice_inventory.owned", { count: diceOfSelectedType.length, type: selectedDiceType }) }}
        </p>
      </div>

      <div v-if="diceOfSelectedType.length > 0" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <DiceCard
          v-for="dice in diceOfSelectedType"
          :key="dice.id"
          :dice="dice"
          :is-favorite="favoriteDiceId === dice.id"
          @equip="handleEquipDice(dice)"
          @unequip="handleUnequipDice(dice)"
          @set-favorite="handleSetFavoriteDice(dice)"
        />
      </div>

      <div
        v-else
        class="p-8 border-2 border-dashed rounded-lg text-center"
      >
        <h3 class="text-lg font-bold mb-2">{{ t("dice_inventory.none", { type: selectedDiceType.toUpperCase() }) }}</h3>
        <p class="text-muted-foreground text-sm">
          {{ t("dice_inventory.purchase_hint", { type: selectedDiceType }) }}
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
import { useI18n } from "@/i18n";

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
const { t } = useI18n();

const selectedDiceType = ref<string | null>(null);
const favoriteDiceId = computed(() => userStore.favoriteDiceId);

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
    uiStore.showToast(
      t("dice_inventory.toast_equipped", { type: dice.dice_type?.dice_notation?.toUpperCase() ?? "D6" }),
      "success",
    );
  } catch (error) {
    console.error("Failed to equip dice:", error);
    uiStore.showToast(t("dice_inventory.error_equip"), "error");
  }
};

const handleUnequipDice = async (dice: any) => {
  if (!dice.is_equipped) return;
  uiStore.showToast(t("dice_inventory.toast_replace_info"), "info");
};

const handleSetFavoriteDice = async (dice: any) => {
  if (!userStore.userId) return;
  if (favoriteDiceId.value === dice.id) return;

  try {
    await inventoryStore.setFavoriteDice(dice.id);
    uiStore.showToast(
      t("dice_inventory.toast_favorite", { type: dice.dice_type?.dice_notation?.toUpperCase() ?? "D6" }),
      "success",
    );
  } catch (error) {
    console.error("Failed to set favorite dice:", error);
    uiStore.showToast(t("dice_inventory.error_favorite"), "error");
  }
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
