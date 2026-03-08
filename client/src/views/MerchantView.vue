<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="text-6xl mb-4">вЏі</div>
      <p class="text-xl font-semibold">Loading merchant...</p>
    </div>

    <!-- No Active Event -->
    <div v-else-if="!eventStore.isEventActive" class="text-center py-12">
      <div class="text-6xl mb-4">рџЋІ</div>
      <h1 class="text-3xl font-bold mb-4">No Active Event</h1>
      <p class="text-muted-foreground mb-6">
        Trigger an event from the dashboard to start your adventure!
      </p>
      <button
        @click="router.push('/')"
        class="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
      >
        Back to Dashboard
      </button>
    </div>

    <!-- Merchant Event -->
    <div v-else class="space-y-6">
      <div class="grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <button
          @click="router.push('/')"
          class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span class="text-xl">&larr;</span>
          <span class="font-semibold">Back</span>
        </button>
        <div class="text-center">
        <h1 class="text-3xl font-bold mb-2">рџЏЄ Traveling Merchant!</h1>
        <p class="text-muted-foreground">
          {{ eventStore.currentEvent?.description }}
        </p>
        </div>
        <span class="w-14" aria-hidden="true"></span>
      </div>

      <!-- Merchant Inventory -->
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- Current Balance -->
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">Current Balance</p>
          <p class="text-2xl font-bold">{{ userStore.currency }}</p>
        </div>

        <!-- Items -->
        <div v-if="merchantItems.length > 0">
          <h2 class="text-2xl font-bold mb-4">Items for Sale</h2>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ShopCard
              v-for="item in merchantItems"
              :key="item.id"
              type="item"
              :item="item"
              :can-afford="userStore.currency >= item.price"
              @purchase="handlePurchaseItem(item.id)"
              :player-currency="userStore.currency"
            />
          </div>
        </div>

        <!-- Dice -->
        <div v-if="merchantDice.length > 0">
          <h2 class="text-2xl font-bold mb-4">Dice for Sale</h2>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <DiceShopCard
              v-for="dice in merchantDice"
              :key="dice.id"
              :dice="dice"
              @purchase="handlePurchaseDice(dice.id)"
              :player-currency="userStore.currency"
            />
          </div>
        </div>

        <!-- Leave Button -->
        <div class="text-center pt-6">
          <button
            @click="handleLeaveMerchant"
            class="px-8 py-3 border-2 border-border rounded-lg font-bold hover:bg-muted transition-all"
          >
            Leave Merchant
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useEventStore } from "@/stores/event";
import { useUserStore } from "@/stores/user";
import { useInventoryStore } from "@/stores/inventory";
import { useApi } from "@/composables/useApi";
import ShopCard from "@/components/game/ShopCard.vue";
import DiceShopCard from "@/components/game/DiceShopCard.vue";

const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const inventoryStore = useInventoryStore();
const { api, apiCall } = useApi();

const loading = ref(false);

// Merchant data
const merchantItems = ref<any[]>([]);
const merchantDice = ref<any[]>([]);

// Handle purchase item
const handlePurchaseItem = async (itemId: string) => {
  if (!userStore.userId) return;

  try {
    await inventoryStore.purchaseItem(userStore.userId, itemId);
    await userStore.getCurrentUser();

    // Remove from merchant display
    merchantItems.value = merchantItems.value.filter(
      (item) => item.id !== itemId,
    );
  } catch (error) {
    console.error("Failed to purchase item:", error);
  }
};

// Handle purchase dice
const handlePurchaseDice = async (diceId: string) => {
  if (!userStore.userId) return;

  try {
    await inventoryStore.purchaseDice(userStore.userId, diceId);
    await userStore.getCurrentUser();

    // Remove from merchant display
    merchantDice.value = merchantDice.value.filter(
      (dice) => dice.id !== diceId,
    );
  } catch (error) {
    console.error("Failed to purchase dice:", error);
  }
};

// Handle leave merchant
const handleLeaveMerchant = async () => {
  const userId = userStore.userId;
  if (!userId) return;

  try {
    await apiCall(
      () => api.api.events.merchant.leave.post({
        player_id: userId,
      }),
      { successMessage: "Left merchant" },
    );

    // Clear event from store
    eventStore.clearEvent();

    router.push("/");
  } catch (error) {
    console.error("Failed to leave merchant:", error);
  }
};

// Load event data
onMounted(async () => {
  if (!userStore.userId) return;

  loading.value = true;

  try {
    await userStore.getCurrentUser();

    // Load event-specific data
    if (eventStore.isMerchant && eventStore.merchantData) {
      // Load merchant inventory
      merchantItems.value = eventStore.merchantData.available_items || [];
      merchantDice.value = eventStore.merchantData.available_dice || [];
    }
  } catch (error) {
    console.error("Failed to load event data:", error);
  } finally {
    loading.value = false;
  }
});
</script>
