<template>
  <div class="compact-party-grid">
    <!-- Label (optional) -->
    <h3 v-if="label" class="text-lg font-bold text-foreground mb-3 text-center">
      {{ label }}
    </h3>

    <!-- 3+2 Grid Layout -->
    <div class="space-y-3">
      <!-- Top Row: 3 slots -->
      <div class="grid grid-cols-3 gap-3">
        <div
          v-for="index in 3"
          :key="`slot-${index - 1}`"
          class="party-slot"
        >
          <PartySlotCard
            v-if="party[index - 1]"
            :elemental="party[index - 1]"
            :show-actions="showActions"
            @click="$emit('select', party[index - 1])"
          />
          <EmptySlotCard v-else :slot-number="index" />
        </div>
      </div>

      <!-- Bottom Row: 2 slots (centered) -->
      <div class="grid grid-cols-3 gap-3">
        <div class="col-start-1 party-slot">
          <PartySlotCard
            v-if="party[3]"
            :elemental="party[3]"
            :show-actions="showActions"
            @click="$emit('select', party[3])"
          />
          <EmptySlotCard v-else :slot-number="4" />
        </div>
        <div class="col-start-3 party-slot">
          <PartySlotCard
            v-if="party[4]"
            :elemental="party[4]"
            :show-actions="showActions"
            @click="$emit('select', party[4])"
          />
          <EmptySlotCard v-else :slot-number="5" />
        </div>
      </div>
    </div>

    <!-- Stats Summary (optional) -->
    <div v-if="showStats" class="mt-4 text-center text-sm text-muted-foreground">
      <span class="font-semibold">Total Power:</span> {{ totalPower }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerElemental } from '@elementary-dices/shared'

interface Props {
  party: (PlayerElemental | null)[]
  label?: string
  showActions?: boolean
  showStats?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  party: () => [],
  label: '',
  showActions: false,
  showStats: false,
})

const emit = defineEmits<{
  select: [elemental: PlayerElemental]
}>()

const totalPower = computed(() => {
  return props.party
    .filter((el): el is PlayerElemental => el !== null)
    .reduce((sum, el) => sum + (el.power || 0), 0)
})
</script>

<script lang="ts">
// PartySlotCard component (inline for simplicity)
import { defineComponent, type PropType } from 'vue'

const PartySlotCard = defineComponent({
  name: 'PartySlotCard',
  props: {
    elemental: {
      type: Object as PropType<PlayerElemental>,
      required: true,
    },
    showActions: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const getElementColor = (element: string) => {
      const colors: Record<string, string> = {
        fire: 'bg-red-500/20 border-red-500',
        water: 'bg-blue-500/20 border-blue-500',
        earth: 'bg-green-500/20 border-green-500',
        air: 'bg-cyan-500/20 border-cyan-500',
        lightning: 'bg-yellow-500/20 border-yellow-500',
      }
      return colors[element] || 'bg-muted border-border'
    }

    return { getElementColor }
  },
  template: `
    <div
      class="party-slot-card relative p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105"
      :class="getElementColor(elemental.elemental?.element || '')"
    >
      <!-- Elemental Image -->
      <div class="aspect-square rounded-lg bg-background/50 mb-2 flex items-center justify-center overflow-hidden">
        <img
          v-if="elemental.elemental?.image_url"
          :src="elemental.elemental.image_url"
          :alt="elemental.elemental.name"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-3xl">{{ elemental.elemental?.emoji || '❓' }}</span>
      </div>

      <!-- Elemental Name -->
      <div class="text-center">
        <p class="text-xs font-bold text-foreground truncate">
          {{ elemental.elemental?.name }}
        </p>
        <p class="text-xs text-muted-foreground">
          ⚡ {{ elemental.power }}
        </p>
      </div>

      <!-- Level Badge -->
      <div
        class="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
      >
        {{ elemental.level }}
      </div>
    </div>
  `,
})

const EmptySlotCard = defineComponent({
  name: 'EmptySlotCard',
  props: {
    slotNumber: {
      type: Number,
      required: true,
    },
  },
  template: `
    <div class="empty-slot-card p-3 rounded-lg border-2 border-dashed border-border bg-muted/30">
      <div class="aspect-square rounded-lg bg-muted/50 mb-2 flex items-center justify-center">
        <span class="text-4xl text-muted-foreground opacity-50">+</span>
      </div>
      <div class="text-center">
        <p class="text-xs text-muted-foreground">Empty Slot</p>
      </div>
    </div>
  `,
})

export { PartySlotCard, EmptySlotCard }
</script>

<style scoped>
.party-slot {
  min-width: 0; /* Allow grid items to shrink */
}

.party-slot-card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.party-slot-card:hover {
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}

.empty-slot-card {
  opacity: 0.6;
}

.empty-slot-card:hover {
  opacity: 0.8;
}

@media (max-width: 640px) {
  .compact-party-grid {
    font-size: 0.875rem;
  }
}
</style>
