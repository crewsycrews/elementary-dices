<template>
  <div class="container mx-auto p-6 space-y-6">
    <ViewOnboardingModal
      v-if="showOnboarding"
      :title="t('party.onboarding_title')"
      :subtitle="t('party.onboarding_subtitle')"
      :steps="onboardingSteps"
      @close="dismissOnboarding"
      @complete="dismissOnboarding"
    />

    <!-- Header -->
    <div class="flex items-start gap-3">
    <button
      @click="$router.push('/')"
      class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span class="text-xl">←</span>
      <span class="font-semibold">{{ t("common.back") }}</span>
    </button>

    <div>
      <h1 class="text-3xl font-bold mb-2">👥 {{ t("party.title") }}</h1>
      <p class="text-muted-foreground">
        {{ t("party.subtitle") }}
      </p>
    </div>
    </div>

    <!-- Active Party -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">
          {{ t("party.active", { count: activePartyWithData.filter(Boolean).length }) }}
        </h2>
        <p class="text-sm text-muted-foreground">{{ t("party.drag_reorder") }}</p>
      </div>

      <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <PartySlot
          v-for="(member, index) in activePartyWithData"
          :key="member?.playerElemental?.id || `empty-${index}`"
          :position="index + 1"
          :player-elemental="member?.playerElemental"
          :elemental="member?.elemental"
          :is-draggable="!!member"
          :show-health="true"
          :show-stats="false"
          @click="handlePartySlotClick(index + 1)"
          @drag-start="handleDragStart"
          @drag-end="handleDragEnd"
          @drop="handleDrop"
        />
      </div>

      <!-- Party Stats -->
      <div class="flex gap-4 justify-center">
        <div class="px-6 py-3 bg-card border-2 border-border rounded-lg">
          <p class="text-sm text-muted-foreground">{{ t("party.total_power") }}</p>
          <p class="text-2xl font-bold text-primary">{{ totalPartyPower }}</p>
        </div>
      </div>
    </div>

    <!-- Evolution Link -->
    <div>
      <button
        @click="$router.push('/evolutions')"
        class="w-full p-6 border-2 border-dashed border-primary/50 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
      >
        <div class="flex items-center justify-center gap-4">
          <div class="text-4xl">🔮</div>
          <div class="text-left">
            <h3 class="text-xl font-bold group-hover:text-primary">
              {{ t("party.evolutions_title") }}
            </h3>
            <p class="text-sm text-muted-foreground">
              {{ t("party.evolutions_desc") }}
            </p>
          </div>
          <div class="text-2xl">→</div>
        </div>
      </button>
    </div>

    <!-- Backpack -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">
          {{ t("party.backpack", { count: backpackWithData.length, max: maxBackpackSize }) }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ t("party.select_to_add") }}
        </p>
      </div>

      <div
        v-if="backpackWithData.length > 0"
        class="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <ElementalCard
          v-for="member in backpackWithData"
          :key="member.playerElemental.id"
          :elemental="member.elemental"
          :stats="member.playerElemental.current_stats"
          :is-selectable="true"
          :is-draggable="true"
          :player-elemental-id="member.playerElemental.id"
          @click="handleAddToParty(member)"
          @drag-start="handleBackpackDragStart(member)"
          @drag-end="handleDragEnd"
        />
      </div>

      <div v-else class="p-12 border-2 border-dashed rounded-lg text-center">
        <div class="text-6xl mb-4">📦</div>
        <h3 class="text-xl font-bold mb-2">{{ t("party.empty_backpack") }}</h3>
        <p class="text-muted-foreground">
          {{ t("party.empty_backpack_hint") }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useUserStore } from "@/stores/user";
import { useElementalsStore } from "@/stores/elementals";
import { useUIStore } from "@/stores/ui";
import { useApi } from "@/composables/useApi";
import { playerApi } from "@/composables/useApiHelpers";
import PartySlot from "@/components/game/PartySlot.vue";
import ElementalCard from "@/components/game/ElementalCard.vue";
import ViewOnboardingModal from "@/components/onboarding/ViewOnboardingModal.vue";
import { useI18n } from "@/i18n";

const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const uiStore = useUIStore();
const { t, locale } = useI18n();

const maxBackpackSize = 20;
const showOnboarding = ref(false);
const onboardingStorageScope = "party-v1";

const onboardingSteps = computed(() =>
  locale.value === "ru"
    ? [
        {
          title: "Поимка расширяет ростер",
          description:
            "Новых элементалей вы в основном получаете в Диких встречах. Пойманные юниты попадают в коллекцию и могут быть перемещены в активные слоты.",
          bullets: [
            "Используйте Текущее событие, чтобы запускать встречи.",
            "Пойманные элементали увеличивают ваши варианты контров и эволюций.",
            "Уничтоженных в битве юнитов нельзя снова выставить в этой же битве.",
          ],
        },
        {
          title: "Собирайте активную группу осознанно",
          description:
            "Вы можете выставить до 5 активных элементалей. Позиции и состав определяют, кого вы сможете выставлять в раундах битвы.",
          bullets: [
            "Перетаскивайте слоты для изменения порядка.",
            "Подтягивайте резерв из рюкзака при смене плана.",
            "Смешивайте элементы, чтобы закрывать цепочки слабостей.",
          ],
        },
        {
          title: "Слабости элементов и боевой план",
          description:
            "Бой использует атаку и здоровье. Эксплуатация слабости дает +10% урона.",
          bullets: [
            "Water -> Fire, Fire -> Air, Air -> Earth, Earth -> Water.",
            "Lightning нейтрален: без пассивной слабости и бонуса.",
            "Собирайте группу, способную давить вероятные составы соперника.",
          ],
        },
      ]
    : [
        {
          title: "Capturing gives you roster depth",
          description:
            "You primarily gain new elementals from Wild Encounters. Captured units appear in your collection and can be moved into active slots.",
          bullets: [
            "Use Current Event to start encounters.",
            "Captured elementals increase your options for counters and evolutions.",
            "Destroyed units in a battle cannot be deployed again in that same battle.",
          ],
        },
        {
          title: "Build the active party carefully",
          description:
            "You can deploy up to 5 active elementals. Positioning and composition determine what you can deploy in battle rounds.",
          bullets: [
            "Drag and drop to reorder active slots.",
            "Move backups in from backpack when your strategy changes.",
            "Mix elements to cover weakness chains in combat.",
          ],
        },
        {
          title: "Element weakness and battle intent",
          description:
            "Combat uses attack and health. Element weakness grants +10% damage when exploited.",
          bullets: [
            "Water -> Fire, Fire -> Air, Air -> Earth, Earth -> Water.",
            "Lightning is neutral: no passive weakness or bonus.",
            "Prioritize a party that can pressure likely enemy compositions.",
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

// Track dragged elemental
const draggedElemental = ref<{
  playerElemental: any;
  elemental: any;
  position?: number;
} | null>(null);

// Elemental data with full details - always returns 5 slots (some may be null)
const activePartyWithData = computed(() => {
  const slots: Array<{ playerElemental: any; elemental: any } | null> =
    Array(5).fill(null);

  elementalsStore.activeParty.forEach((playerElemental) => {
    const elemental = elementalsStore.allElementals.find(
      (e) => e.id === playerElemental.elemental_id,
    );
    if (elemental && playerElemental.party_position) {
      const index = playerElemental.party_position - 1; // party_position is 1-indexed
      if (index >= 0 && index < 5) {
        slots[index] = { playerElemental, elemental };
      }
    }
  });

  return slots;
});

const backpackWithData = computed(() => {
  return elementalsStore.backpack
    .map((playerElemental) => {
      const elemental = elementalsStore.allElementals.find(
        (e) => e.id === playerElemental.elemental_id,
      );
      return elemental ? { playerElemental, elemental } : null;
    })
    .filter(Boolean) as Array<{ playerElemental: any; elemental: any }>;
});

const totalPartyPower = computed(() => {
  return elementalsStore.activeParty.reduce((sum, elemental) => {
    const stats = elemental.current_stats;
    return sum + stats.attack + stats.defense + stats.speed;
  }, 0);
});

// Handle drag start from party slot
const handleDragStart = (position: number, playerElemental: any) => {
  const member = activePartyWithData.value[position - 1];
  if (member) {
    draggedElemental.value = { ...member, position };
  }
};

// Handle drag start from backpack
const handleBackpackDragStart = (member: {
  playerElemental: any;
  elemental: any;
}) => {
  draggedElemental.value = { ...member }; // No position means it's from backpack
};

// Handle drag end
const handleDragEnd = () => {
  draggedElemental.value = null;
};

// Handle drop on party slot (reordering)
const handleDrop = async (targetPosition: number) => {
  const userId = userStore.userId;
  if (!draggedElemental.value || !userId) return;

  const sourcePosition = draggedElemental.value.position;

  if (!sourcePosition) {
    // Dragged from backpack - add to party at target position
    await handleAddToPartyAtPosition(draggedElemental.value, targetPosition);
  } else if (sourcePosition !== targetPosition) {
    // Dragged within party - swap positions
    try {
      const { apiCall } = useApi();
      const response = await apiCall(
        () => playerApi.swapPartyPositions(userId, {
          position1: sourcePosition,
          position2: targetPosition,
        }),
        { silent: true },
      );

      if (response.data) {
        // Refresh party data
        await elementalsStore.fetchPlayerElementals(userId);
        uiStore.showToast(t("party.toast_positions_swapped"), "success");
      }
    } catch (error) {
      console.error("Failed to swap positions:", error);
      uiStore.showToast(t("party.error_positions_swapped"), "error");
    }
  }

  draggedElemental.value = null;
};

// Handle adding from backpack to specific position
const handleAddToPartyAtPosition = async (
  member: { playerElemental: any; elemental: any },
  position: number,
) => {
  const userId = userStore.userId;
  if (!userId) return;

  const targetSlot = activePartyWithData.value[position - 1];

  // If target slot is occupied, remove the occupant first
  if (targetSlot) {
    try {
      const { apiCall } = useApi();
      await apiCall(
        () => playerApi.updateElemental(
          userId,
          targetSlot.playerElemental.id,
          {
            is_in_active_party: false,
            party_position: null,
          },
        ),
        { silent: true },
      );
    } catch (error) {
      console.error("Failed to remove elemental from slot:", error);
      uiStore.showToast(t("party.error_swap_elementals"), "error");
      return;
    }
  }

  // Check if party is full (excluding the target slot we just cleared)
  const filledSlots = activePartyWithData.value.filter(Boolean).length;
  if (!targetSlot && filledSlots >= 5) {
    uiStore.showToast(t("party.error_party_full"), "error");
    return;
  }

  try {
    const { apiCall } = useApi();
    await apiCall(
      () => playerApi.updateElemental(userId, member.playerElemental.id, {
        is_in_active_party: true,
        party_position: position,
      }),
      { silent: true },
    );

    await elementalsStore.fetchPlayerElementals(userId);

    if (targetSlot) {
      uiStore.showToast(
        t("party.toast_swapped_with", {
          member: member.elemental.name,
          target: targetSlot.elemental.name,
        }),
        "success",
      );
    } else {
      uiStore.showToast(
        t("party.toast_added", { member: member.elemental.name }),
        "success",
      );
    }
  } catch (error) {
    console.error("Failed to add to party:", error);
    uiStore.showToast(t("party.error_add"), "error");
  }
};

// Handle removing from party
const handleRemoveFromParty = async (position: number) => {
  if (!userStore.userId) return;

  const member = activePartyWithData.value[position - 1];
  if (!member) return;

  try {
    await elementalsStore.removeFromParty(
      userStore.userId,
      member.playerElemental.id,
    );
    uiStore.showToast(
      t("party.toast_moved_backpack", { member: member.elemental.name }),
      "success",
    );
  } catch (error) {
    console.error("Failed to remove from party:", error);
    uiStore.showToast(t("party.error_remove"), "error");
  }
};

// Handle party slot click
const handlePartySlotClick = (position: number) => {
  const member = activePartyWithData.value[position - 1];
  if (member) {
    // Show confirmation to remove from party
    if (confirm(t("party.confirm_remove", { member: member.elemental.name }))) {
      handleRemoveFromParty(position);
    }
  }
};

// Handle adding elemental to party (click on backpack card)
const handleAddToParty = async (member: {
  playerElemental: any;
  elemental: any;
}) => {
  if (!userStore.userId) return;

  if (activePartyWithData.value.filter(Boolean).length >= 5) {
    uiStore.showToast(t("party.error_party_full"), "error");
    return;
  }

  try {
    await elementalsStore.addToParty(
      userStore.userId,
      member.playerElemental.id,
    );
    uiStore.showToast(
      t("party.toast_added", { member: member.elemental.name }),
      "success",
    );
  } catch (error) {
    console.error("Failed to add to party:", error);
    uiStore.showToast(t("party.error_add"), "error");
  }
};

// Load data on mount
onMounted(async () => {
  if (!userStore.userId) return;

  const onboardingKey = getOnboardingStorageKey();
  if (onboardingKey && !localStorage.getItem(onboardingKey)) {
    showOnboarding.value = true;
  }

  try {
    await elementalsStore.fetchAllElementals();
    await elementalsStore.fetchPlayerElementals(userStore.userId);
  } catch (error) {
    console.error("Failed to load party data:", error);
  }
});
</script>
