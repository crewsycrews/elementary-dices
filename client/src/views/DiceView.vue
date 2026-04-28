<template>
  <div class="container mx-auto p-6 space-y-6">
    <ViewOnboardingModal
      v-if="showOnboarding"
      :title="t('dice.onboarding_title')"
      :subtitle="t('dice.onboarding_subtitle')"
      :steps="onboardingSteps"
      @close="dismissOnboarding"
      @complete="dismissOnboarding"
    />

    <!-- Header -->
    <div class="grid grid-cols-[auto_1fr_auto] items-start gap-3">
    <button
      @click="$router.push('/menu')"
      class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span class="text-xl">←</span>
      <span class="font-semibold">{{ t("common.back") }}</span>
    </button>

    <div class="text-center">
      <h1 class="text-3xl font-bold mb-2">🎲 {{ t("dice.title") }}</h1>
      <p class="text-muted-foreground">
        {{ t("dice.subtitle") }}
      </p>
    </div>
      <span class="w-14" aria-hidden="true"></span>
    </div>

    <!-- Hand Dice Selector -->
    <div class="py-8">
      <DiceInventoryPanel />
    </div>


    <!-- Instructions -->
    <div class="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
      <p>
        💡 {{ t("dice.tip") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "@/stores/user";
import { useInventoryStore } from "@/stores/inventory";
import DiceInventoryPanel from "@/components/game/DiceInventoryPanel.vue";
import ViewOnboardingModal from "@/components/onboarding/ViewOnboardingModal.vue";
import { useI18n } from "@/i18n";

const userStore = useUserStore();
const inventoryStore = useInventoryStore();
const { t, locale } = useI18n();
const showOnboarding = ref(false);
const onboardingStorageScope = "dice-v1";

const onboardingSteps = computed(() =>
  locale.value === "ru"
    ? [
        {
          title: "Кости определяют варианты хода",
          description:
            "Выбор костей влияет на то, какие элементы легче выбрасывать и насколько стабильно собираются комбинации в ходах Farkle.",
          bullets: [
            "Экипируйте кости под микс элементов вашей группы.",
            "Нотации и редкость влияют на стабильность бросков.",
            "Кости более высокого качества позволяют строить сильнее ходы.",
          ],
        },
        {
          title: "Цели комбинаций Farkle",
          description:
            "В боевых ходах вы бросаете пять костей и откладываете комбинации, чтобы набрать бонусы перед выставлением.",
          bullets: [
            "Triplet, Quartet, All-For-One, Full House и One-For-All дают бонусы.",
            "Выбранный отложенный элемент дает прямой +10% к атаке.",
            "Если после переброса случился bust, бонусы хода теряются.",
          ],
        },
      ]
    : [
        {
          title: "Your dice define turn options",
          description:
            "Dice choice affects which elements are easier to roll and how reliably you can build combinations during Farkle turns.",
          bullets: [
            "Equip dice that support your party element mix.",
            "Different notations and rarities shift roll consistency.",
            "Higher quality dice can create stronger turn setups.",
          ],
        },
        {
          title: "Farkle combo goals",
          description:
            "During battle turns, you roll five dice and set aside combinations to build bonuses before deployment.",
          bullets: [
            "Triplet, Quartet, All-For-One, Full House, and One-For-All give bonuses.",
            "Set-aside chosen element gives a direct +10% attack boost.",
            "If you bust after rerolling, turn bonuses are lost.",
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

// Load data on mount
onMounted(async () => {
  if (!userStore.userId) return;

  const onboardingKey = getOnboardingStorageKey();
  if (onboardingKey && !localStorage.getItem(onboardingKey)) {
    showOnboarding.value = true;
  }

  try {
    await inventoryStore.fetchPlayerDice(userStore.userId);
  } catch (error) {
    console.error("Failed to load dice:", error);
  }
});
</script>
