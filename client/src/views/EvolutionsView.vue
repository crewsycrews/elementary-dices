<template>
  <div class="container mx-auto p-6 space-y-6 max-w-4xl">
    <ViewOnboardingModal
      v-if="showOnboarding"
      :title="t('evolutions.onboarding_title')"
      :subtitle="t('evolutions.onboarding_subtitle')"
      :steps="onboardingSteps"
      @close="dismissOnboarding"
      @complete="dismissOnboarding"
    />

    <div class="flex items-start gap-3">
    <!-- Back Button -->
    <button
      @click="$router.push('/party')"
      class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span class="text-xl">←</span>
      <span class="font-semibold">{{ t("evolutions.back_to_party") }}</span>
    </button>

    <h1 class="text-3xl font-bold">{{ t("evolutions.title") }}</h1>
    </div>

    <!-- Result Banner -->
    <Transition name="fade">
      <div
        v-if="lastResult"
        class="p-4 rounded-lg border-2 text-center"
        :class="
          lastResult.success
            ? 'border-green-500 bg-green-500/10 text-green-400'
            : 'border-red-500 bg-red-500/10 text-red-400'
        "
      >
        <p class="font-bold text-lg">{{ lastResult.message }}</p>
        <button
          @click="lastResult = null"
          class="text-sm opacity-60 hover:opacity-100 mt-1"
        >
          {{ t("evolutions.dismiss") }}
        </button>
      </div>
    </Transition>

    <!-- Ritual Arena -->
    <div class="border-2 border-border rounded-xl p-8 bg-card/50">
      <p
        class="text-center text-sm text-muted-foreground mb-6 uppercase tracking-widest"
      >
        {{ t("evolutions.ritual_arena") }}
      </p>

      <!-- Triangle layout: top + bottom row -->
      <div
        class="flex flex-col items-center gap-0 relative"
        style="min-height: 240px"
      >
        <!-- Top circle -->
        <div class="relative z-10 mb-6">
          <div
            class="w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-200"
            :class="
              slots[0].playerElemental
                ? [
                    getSlotBorderColor(0),
                    'bg-card/80 shadow-lg cursor-pointer hover:opacity-80',
                  ]
                : 'border-dashed border-muted-foreground/40 bg-muted/10'
            "
            @click="slots[0].playerElemental ? removeFromSlot(0) : null"
          >
            <template v-if="slots[0].playerElemental && slots[0].elemental">
              <div class="text-3xl leading-none">
                {{ getElementEmoji(slots[0].elemental.element_types[0]) }}
              </div>
              <div
                class="text-xs font-semibold mt-1 px-1 text-center leading-tight line-clamp-1"
              >
                {{ slots[0].elemental.name }}
              </div>
              <div class="text-xs text-muted-foreground">
                Lv {{ slots[0].elemental.level }}
              </div>
            </template>
            <template v-else>
              <div class="text-2xl text-muted-foreground/30">+</div>
            </template>
          </div>
        </div>

        <!-- Bottom two circles -->
        <div class="flex gap-20 relative z-10">
          <div
            v-for="pos in [1, 2]"
            :key="pos"
            class="w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-200"
            :class="
              slots[pos].playerElemental
                ? [
                    getSlotBorderColor(pos),
                    'bg-card/80 shadow-lg cursor-pointer hover:opacity-80',
                  ]
                : 'border-dashed border-muted-foreground/40 bg-muted/10'
            "
            @click="slots[pos].playerElemental ? removeFromSlot(pos) : null"
          >
            <template v-if="slots[pos].playerElemental && slots[pos].elemental">
              <div class="text-3xl leading-none">
                {{ getElementEmoji(slots[pos].elemental!.element_types[0]) }}
              </div>
              <div
                class="text-xs font-semibold mt-1 px-1 text-center leading-tight line-clamp-1"
              >
                {{ slots[pos].elemental!.name }}
              </div>
              <div class="text-xs text-muted-foreground">
                Lv {{ slots[pos].elemental!.level }}
              </div>
            </template>
            <template v-else>
              <div class="text-2xl text-muted-foreground/30">+</div>
            </template>
          </div>
        </div>
      </div>

      <!-- Evolve Button + feedback -->
      <div class="flex flex-col items-center gap-2 mt-8">
        <button
          :disabled="!isValidCombination || isProcessing"
          @click="handleEvolve"
          class="px-10 py-3 rounded-lg font-bold text-lg transition-all duration-200"
          :class="
            isValidCombination && !isProcessing
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-primary/25'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          "
        >
          <span v-if="isProcessing">{{ t("evolutions.evolving") }}</span>
          <span v-else>{{ t("evolutions.evolve") }}</span>
        </button>
        <p
          v-if="filledSlotsCount > 0 && !isValidCombination"
          class="text-xs text-muted-foreground"
        >
          {{ validationErrors[0] }}
        </p>
        <button
          v-if="filledSlotsCount > 0"
          @click="clearAllSlots"
          class="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {{ t("evolutions.clear_all") }}
        </button>
      </div>
    </div>

    <!-- Elemental Collection -->
    <div>
      <p class="text-sm text-muted-foreground uppercase tracking-widest mb-3">
        {{ t("evolutions.all_elementals", { count: allPlayerElementals.length }) }}
      </p>

      <div
        v-if="isLoadingElementals"
        class="text-center py-8 text-muted-foreground"
      >
        {{ t("evolutions.loading_elementals") }}
      </div>

      <div
        v-else-if="allPlayerElementals.length === 0"
        class="text-center py-8 text-muted-foreground"
      >
        {{ t("evolutions.empty_elementals") }}
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <div
          v-for="item in allPlayerElementals"
          :key="item.playerElemental.id"
          class="transition-opacity duration-150"
          :class="
            isElementalInSlots(item.playerElemental.id)
              ? 'opacity-40 pointer-events-none'
              : 'cursor-pointer'
          "
          @click="handleAddElemental(item)"
        >
          <ElementalCard
            :elemental="item.elemental"
            :stats="item.playerElemental.current_stats"
            :compact="true"
            :show-stats="false"
            :is-selectable="!isElementalInSlots(item.playerElemental.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useElementalsStore } from "@/stores/elementals";
import { useUserStore } from "@/stores/user";
import { useElementalCombination } from "@/composables/useElementalCombination";
import ElementalCard from "@/components/game/ElementalCard.vue";
import ViewOnboardingModal from "@/components/onboarding/ViewOnboardingModal.vue";
import type { PlayerElemental, Elemental } from "@elementary-dices/shared";
import { useI18n } from "@/i18n";

const elementalsStore = useElementalsStore();
const userStore = useUserStore();
const { t, locale } = useI18n();

const {
  slots,
  isProcessing,
  filledSlotsCount,
  isValidCombination,
  validationErrors,
  isElementalInSlots,
  addToSlot,
  removeFromSlot,
  clearAllSlots,
  performCombination,
} = useElementalCombination();

const isLoadingElementals = ref(false);
const lastResult = ref<{ success: boolean; message: string } | null>(null);
const showOnboarding = ref(false);
const onboardingStorageScope = "evolutions-v1";

const onboardingSteps = computed(() =>
  locale.value === "ru"
    ? [
        {
          title: "Эволюция расходует выбранных элементалей",
          description:
            "Выберите валидные ингредиенты в ритуальных слотах, затем выполните эволюцию и получите более сильный результат по рецептам.",
          bullets: [
            "Используйте три ритуальных слота для составления корректного рецепта.",
            "Невалидные комбинации отклоняются и не создают нового юнита.",
            "Успешные эволюции должны отразиться в вашем ростере.",
          ],
        },
        {
          title: "Планируйте уровни и требования выставления",
          description:
            "Элементали высокого уровня сильнее, а для выставления 3-4 уровней в цепочках Dice Rush требования строже.",
          bullets: [
            "Сохраняйте разнообразие ингредиентов для гибких будущих сборок.",
            "Не вкладывайтесь слишком рано только в один элемент.",
            "Стройте эволюции под ваш предпочтительный стиль костей.",
          ],
        },
      ]
    : [
        {
          title: "Evolution consumes selected elementals",
          description:
            "Pick valid ingredients in the ritual slots, then evolve to create a stronger result based on configured recipes.",
          bullets: [
            "Use the three ritual slots to compose a valid recipe.",
            "Invalid combinations are rejected without creating a new unit.",
            "Successful evolutions should be reflected in your roster.",
          ],
        },
        {
          title: "Plan around level and deployment requirements",
          description:
            "Higher-level elementals are stronger, and level 3-4 deployment has stricter requirements in Dice Rush chains.",
          bullets: [
            "Keep ingredient diversity for flexible future compositions.",
            "Do not over-invest into a single element too early.",
            "Build evolutions that match your preferred dice strategy.",
          ],
        },
      ],
);

const getOnboardingStorageKey = () => {
  if (!userStore.userId) return null;
  return `elementary-dices:onboarding:${userStore.userId}:${onboardingStorageScope}`;
};

const dismissOnboarding = () => {
  const key = getOnboardingStorageKey();
  if (key) localStorage.setItem(key, "seen");
  showOnboarding.value = false;
};

const allPlayerElementals = computed(() => {
  return elementalsStore.playerElementals
    .map((pe) => {
      const elemental = elementalsStore.allElementals.find(
        (e) => e.id === pe.elemental_id,
      );
      if (!elemental) return null;
      return { playerElemental: pe, elemental };
    })
    .filter(
      (
        item,
      ): item is { playerElemental: PlayerElemental; elemental: Elemental } =>
        item !== null,
    );
});

function getElementEmoji(element: string): string {
  const map: Record<string, string> = {
    fire: "🔥",
    water: "💧",
    earth: "🏔️",
    air: "💨",
    lightning: "⚡",
  };
  return map[element] || "❓";
}

function getSlotBorderColor(position: number): string {
  const slot = slots.value[position];
  if (!slot?.elemental) return "border-muted-foreground/40";
  const colors: Record<string, string> = {
    fire: "border-red-500",
    water: "border-blue-500",
    earth: "border-green-600",
    air: "border-cyan-400",
    lightning: "border-yellow-400",
  };
  return colors[slot.elemental.element_types[0]] || "border-gray-400";
}

function handleAddElemental(item: {
  playerElemental: PlayerElemental;
  elemental: Elemental;
}) {
  if (isElementalInSlots(item.playerElemental.id)) return;
  addToSlot(item.playerElemental, item.elemental);
}

async function handleEvolve() {
  if (!userStore.userId) return;

  const result = await performCombination(userStore.userId);

  if (result.success) {
    lastResult.value = {
      success: true,
      message: "Evolution successful! Check your new elemental.",
    };
    await elementalsStore.fetchPlayerElementals(userStore.userId);
  } else {
    lastResult.value = {
      success: false,
      message:
        result.error ||
        "No recipe found for this combination. Try different elementals!",
    };
  }
}

onMounted(async () => {
  if (!userStore.userId) return;
  const onboardingKey = getOnboardingStorageKey();
  if (onboardingKey && !localStorage.getItem(onboardingKey)) {
    showOnboarding.value = true;
  }
  isLoadingElementals.value = true;
  try {
    await Promise.all([
      elementalsStore.fetchPlayerElementals(userStore.userId),
      elementalsStore.fetchAllElementals(),
    ]);
  } finally {
    isLoadingElementals.value = false;
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
