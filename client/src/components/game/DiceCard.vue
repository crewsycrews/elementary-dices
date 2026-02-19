<template>
  <div
    class="flex flex-col gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer"
    :class="
      dice.is_equipped
        ? 'border-primary bg-primary/10 shadow-lg'
        : 'border-border bg-card hover:border-primary hover:bg-muted'
    "
    @click="$emit('equip')"
  >
    <!-- Top row: 3D dice + info -->
    <div class="flex items-center gap-3">
      <!-- 3D Dice preview -->
      <div
        class="shrink-0 flex items-center justify-center"
        style="width: 64px; height: 64px"
      >
        <Dice3D
          :dice-type="diceType"
          :value="maxValue"
          :scale="0.42"
          :show-shadow="false"
          :affinity="affinity ?? undefined"
        />
      </div>

      <!-- Info column -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-bold text-base">{{
            dice.dice_type?.dice_notation?.toUpperCase()
          }}</span>
          <span
            class="px-2 py-0.5 rounded-full text-xs font-bold"
            :class="rarityClass"
            >{{ dice.dice_type?.rarity?.toUpperCase() }}</span
          >
          <span
            v-if="dice.is_equipped"
            class="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-bold"
            >✓</span
          >
        </div>

        <!-- Stats row -->
        <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span
            ><span class="font-semibold text-foreground"
              >{{ multiplier }}x</span
            >
            mult</span
          >
          <span v-if="affinity" class="capitalize">
            <span class="font-semibold text-foreground">{{ affinity }}</span>
            affinity
          </span>
        </div>
      </div>
    </div>

    <!-- Action button -->
    <button
      v-if="!dice.is_equipped"
      class="w-full py-1.5 text-sm bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 transition-all"
      @click.stop="$emit('equip')"
    >
      Equip
    </button>
    <button
      v-else
      class="w-full py-1.5 text-sm border-2 border-border rounded-md font-bold hover:bg-muted transition-all"
      @click.stop="$emit('unequip')"
    >
      Unequip
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Dice3D from "./Dice3D.vue";
import type { DiceType } from "./dice-geometry";

interface DiceTypeData {
  id: string;
  dice_notation: "d4" | "d6" | "d10" | "d12" | "d20";
  rarity: "green" | "blue" | "purple" | "gold";
  name: string;
  description?: string;
  stat_bonuses?: {
    bonus_multiplier?: number;
    element_affinity?: "fire" | "water" | "earth" | "lightning" | "air";
  };
}

interface PlayerDice {
  id: string;
  player_id: string;
  dice_type_id: string;
  is_equipped: boolean;
  dice_type?: DiceTypeData;
}

const props = defineProps<{ dice: PlayerDice }>();
defineEmits<{ equip: []; unequip: [] }>();

const diceType = computed<DiceType>(
  () => (props.dice.dice_type?.dice_notation ?? "d6") as DiceType,
);

const maxValue = computed(() => {
  const map: Record<string, number> = {
    d4: 4,
    d6: 6,
    d10: 10,
    d12: 12,
    d20: 20,
  };
  return map[props.dice.dice_type?.dice_notation ?? "d6"] ?? 6;
});

const multiplier = computed(
  () => props.dice.dice_type?.stat_bonuses?.bonus_multiplier ?? 1,
);

const affinity = computed(
  () => props.dice.dice_type?.stat_bonuses?.element_affinity ?? null,
);

const rarityClass = computed(() => {
  switch (props.dice.dice_type?.rarity) {
    case "green":
      return "bg-green-500/20 text-green-600";
    case "blue":
      return "bg-blue-500/20 text-blue-600";
    case "purple":
      return "bg-purple-500/20 text-purple-600";
    case "gold":
      return "bg-yellow-500/20 text-yellow-600";
    default:
      return "bg-gray-500/20 text-gray-600";
  }
});
</script>
