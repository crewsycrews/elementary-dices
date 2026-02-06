<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold mb-2">Dashboard</h1>
      <p class="text-muted-foreground">
        Welcome back, {{ userStore.username }}! Ready for adventure?
      </p>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Currency Card -->
      <div
        class="p-6 border-2 rounded-lg bg-card hover:shadow-lg transition-all"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Currency</p>
            <p class="text-3xl font-bold">{{ userStore.currency }}</p>
          </div>
          <div class="text-4xl">💰</div>
        </div>
      </div>

      <!-- Elementals Card -->
      <div
        class="p-6 border-2 rounded-lg bg-card hover:shadow-lg transition-all"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Elementals</p>
            <p class="text-3xl font-bold">
              {{ elementalsStore.activeParty.length }}/{{
                elementalsStore.playerElementals.length
              }}
            </p>
          </div>
          <div class="text-4xl">🐉</div>
        </div>
        <p class="text-xs text-muted-foreground mt-2">Active / Total</p>
      </div>

      <!-- Items Card -->
      <div
        class="p-6 border-2 rounded-lg bg-card hover:shadow-lg transition-all"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Items</p>
            <p class="text-3xl font-bold">
              {{ inventoryStore.playerItems.length }}
            </p>
          </div>
          <div class="text-4xl">🎒</div>
        </div>
      </div>

      <!-- Dice Card -->
      <div
        class="p-6 border-2 rounded-lg bg-card hover:shadow-lg transition-all"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Dice</p>
            <p class="text-3xl font-bold">
              {{ inventoryStore.playerDice.length }}
            </p>
          </div>
          <div class="text-4xl">🎲</div>
        </div>
        <p class="text-xs text-muted-foreground mt-2">
          {{
            !inventoryStore.equippedDice
              ? "No dice equipped"
              : `${inventoryStore.equippedDice.dice_type} equipped`
          }}
        </p>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Active Party -->
      <div class="lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Active Party</h2>
          <router-link
            to="/inventory"
            class="text-sm text-primary hover:underline font-semibold"
          >
            Manage Party →
          </router-link>
        </div>

        <!-- Party Slots -->
        <div
          v-if="activePartyWithData.length > 0"
          class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <PartySlot
            v-for="(member, index) in activePartyWithData"
            :key="member.playerElemental.id"
            :position="index + 1"
            :player-elemental="member.playerElemental"
            :elemental="member.elemental"
            :is-draggable="false"
            :show-health="true"
            :show-stats="true"
          />

          <!-- Empty slots -->
          <PartySlot
            v-for="emptyIndex in 5 - activePartyWithData.length"
            :key="`empty-${emptyIndex}`"
            :position="activePartyWithData.length + emptyIndex"
            :is-draggable="false"
            :is-interactive="false"
            empty-text="Empty Slot"
          />
        </div>

        <!-- No Party Message -->
        <div v-else class="p-12 border-2 border-dashed rounded-lg text-center">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-xl font-bold mb-2">No Active Party</h3>
          <p class="text-muted-foreground mb-4">
            You need at least one elemental in your party to start your
            adventure
          </p>
          <router-link
            to="/inventory"
            class="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
          >
            Get Started
          </router-link>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="space-y-4">
        <h2 class="text-2xl font-bold">Quick Actions</h2>

        <div class="space-y-3">
          <!-- Trigger Event Button -->
          <button
            @click="handleTriggerEvent"
            :disabled="!canTriggerEvent"
            class="w-full p-4 border-2 rounded-lg font-bold text-left transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              eventStore.isEventActive
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-card border-border hover:border-primary'
            "
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-lg">
                  {{
                    eventStore.isEventActive
                      ? "⚡ Event Active!"
                      : "🎲 Trigger Event"
                  }}
                </div>
                <div class="text-sm opacity-80">
                  {{
                    eventStore.isEventActive
                      ? "Continue your current event"
                      : "Start a new adventure"
                  }}
                </div>
              </div>
              <div class="text-2xl">→</div>
            </div>
          </button>

          <!-- Shop Button -->
          <router-link
            to="/shop"
            class="block w-full p-4 border-2 border-border rounded-lg font-bold text-left transition-all hover:shadow-lg hover:border-primary"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-lg">🏪 Visit Shop</div>
                <div class="text-sm text-muted-foreground">
                  Buy items and dice
                </div>
              </div>
              <div class="text-2xl">→</div>
            </div>
          </router-link>

          <!-- Evolution Button -->
          <router-link
            to="/evolution"
            class="block w-full p-4 border-2 border-border rounded-lg font-bold text-left transition-all hover:shadow-lg hover:border-primary"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-lg">✨ Evolution Ritual</div>
                <div class="text-sm text-muted-foreground">
                  Combine elementals
                </div>
              </div>
              <div class="text-2xl">→</div>
            </div>
          </router-link>

          <!-- Collection Button -->
          <router-link
            to="/collection"
            class="block w-full p-4 border-2 border-border rounded-lg font-bold text-left transition-all hover:shadow-lg hover:border-primary"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-lg">📚 Collection</div>
                <div class="text-sm text-muted-foreground">
                  {{ elementalsStore.baseElementals.length }} elementals
                  discovered
                </div>
              </div>
              <div class="text-2xl">→</div>
            </div>
          </router-link>
        </div>

        <!-- Event History (if any) -->
        <div v-if="eventStore.eventHistory.length > 0" class="mt-6">
          <h3 class="text-lg font-bold mb-3">Recent Events</h3>
          <div class="space-y-2">
            <div
              v-for="(event, index) in eventStore.eventHistory.slice(0, 3)"
              :key="index"
              class="p-3 border rounded-lg bg-card text-sm"
            >
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{
                  getEventTypeLabel(event.event_type)
                }}</span>
                <span class="text-xs text-muted-foreground">
                  {{ event.timestamp || "In Progress" }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Getting Started Guide (for new users) -->
    <div
      v-if="!hasStartedAdventure"
      class="p-6 border-2 border-primary rounded-lg bg-primary/5"
    >
      <h2 class="text-2xl font-bold mb-4">🌟 Getting Started</h2>
      <div class="grid gap-4 md:grid-cols-3">
        <div class="space-y-2">
          <div class="text-3xl">1️⃣</div>
          <h3 class="font-bold">Roll Your First Elemental</h3>
          <p class="text-sm text-muted-foreground">
            Trigger an event to get your first elemental companion
          </p>
        </div>
        <div class="space-y-2">
          <div class="text-3xl">2️⃣</div>
          <h3 class="font-bold">Build Your Party</h3>
          <p class="text-sm text-muted-foreground">
            Collect up to 5 elementals for your active party
          </p>
        </div>
        <div class="space-y-2">
          <div class="text-3xl">3️⃣</div>
          <h3 class="font-bold">Evolve & Conquer</h3>
          <p class="text-sm text-muted-foreground">
            Combine elementals to discover new evolutions
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useElementalsStore } from "@/stores/elementals";
import { useInventoryStore } from "@/stores/inventory";
import { useEventStore } from "@/stores/event";
import PartySlot from "@/components/game/PartySlot.vue";

const router = useRouter();
const userStore = useUserStore();
const elementalsStore = useElementalsStore();
const inventoryStore = useInventoryStore();
const eventStore = useEventStore();

// Get active party with full elemental data
const activePartyWithData = computed(() => {
  return elementalsStore.activeParty
    .map((playerElemental) => {
      const elemental = elementalsStore.allElementals.find(
        (e) => e.id === playerElemental.elemental_id,
      );
      return elemental ? { playerElemental, elemental } : null;
    })
    .filter(Boolean) as Array<{ playerElemental: any; elemental: any }>;
});

// Check if user can trigger event (has at least one elemental in party)
const canTriggerEvent = computed(() => {
  return elementalsStore.activeParty.length > 0;
});

// Check if user has started their adventure
const hasStartedAdventure = computed(() => {
  return (
    elementalsStore.playerElementals.length > 0 ||
    eventStore.eventHistory.length > 0
  );
});

// Get event type label
const getEventTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    wild_encounter: "🌲 Wild Encounter",
    pvp_battle: "⚔️ PvP Battle",
    merchant: "🏪 Merchant",
  };
  return labels[type] || type;
};

// Handle trigger event
const handleTriggerEvent = () => {
  if (eventStore.isEventActive) {
    router.push("/event");
  } else if (canTriggerEvent.value) {
    // Trigger a new event
    eventStore.triggerEvent(userStore.userId!);
    router.push("/event");
  }
};

// Load initial data
onMounted(async () => {
  if (userStore.userId) {
    try {
      // Load user data
      await userStore.fetchUser(userStore.userId);

      // Load elementals
      await elementalsStore.fetchAllElementals();
      // Note: fetchPlayerElementals will be implemented when backend endpoint is ready

      // Load inventory
      await inventoryStore.fetchPlayerItems(userStore.userId);
      await inventoryStore.fetchPlayerDice(userStore.userId);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }
});
</script>
