<template>
  <div class="central-dice-container flex flex-col items-center gap-2">
    <div class="dice-display-wrapper">
      <Dice3D
        v-if="diceType"
        ref="dice3dRef"
        :dice-type="diceType"
        :value="previewValue"
        :affinity="affinity"
        :element-faces="elementFaces"
        :spinning="spinning"
        @click="handleToyRoll"
      />
    </div>

    <p
      class="pt-4 text-xs text-muted-foreground text-center cursor-pointer"
      @click="handleToyRoll"
    >
        Try your luck!
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Dice3D from "./Dice3D.vue";
import type { DiceType } from "./dice-geometry";

interface Props {
  diceNotation?: string | null;
  affinity?: "fire" | "water" | "earth" | "air" | "lightning";
  elementFaces?: string[];
  spinning?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  diceNotation: "d20",
  affinity: undefined,
  elementFaces: undefined,
  spinning: false,
});

const dice3dRef = ref<InstanceType<typeof Dice3D> | null>(null);

function handleToyRoll() {
  if (!diceType.value || !dice3dRef.value) return;
  const maxFaces = parseInt(diceType.value.slice(1));
  const randomValue = Math.floor(Math.random() * maxFaces) + 1;
  dice3dRef.value.roll(randomValue);
}

const diceType = computed<DiceType | null>(() => {
  if (props.diceNotation) {
    const match = props.diceNotation.match(/d(\d+)/);
    if (match) {
      const type = `d${match[1]}` as DiceType;
      if (["d4", "d6", "d10", "d12", "d20"].includes(type)) {
        return type;
      }
    }
  }
  return "d20";
});

const previewValue = computed(() => {
  if (!diceType.value) return 20;
  return parseInt(diceType.value.slice(1));
});
</script>

<style scoped>
.dice-display-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
</style>
