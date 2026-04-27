import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";
import type { BattleLogEntry } from "@elementary-dices/shared";

// Types based on backend schemas
type EventType = "wild_encounter" | "pvp_battle" | "merchant";

type WildEncounterData = {
  event_id?: string;
  elemental_id: string;
  elemental_name: string;
  elemental_level: number;
  encounter_element?: string;
  capture_difficulty: "easy" | "medium" | "hard";
  farkle_initialized?: boolean;
  farkle_session_id?: string;
  farkle_state?: WildEncounterFarkleState;
  wild_battle_state?: Record<string, unknown>;
};

type MerchantData = {
  available_items: Array<{
    id: string;
    name: string;
    price: number;
    rarity: string;
  }>;
  available_dice: Array<{
    id: string;
    name: string;
    price: number;
    rarity: string;
    dice_notation: string;
    faces: string[];
  }>;
};

export type BattlePartyMember = {
  player_elemental_id?: string;
  elemental_id: string;
  name: string;
  image_url?: string | null;
  element: string;
  elements: string[];
  level: number;
  base_attack: number;
  current_attack: number;
  max_health: number;
  current_health: number;
  is_destroyed: boolean;
  target_index: number;
  battle_modifiers?: {
    damage_pct: number;
    armor_pct: number;
    dodge_pct: number;
    double_attack_pct: number;
  };
};

// Farkle Battle types
export type FarkleDie = {
  player_dice_id: string;
  dice_type_id: string;
  dice_notation: string;
  faces: string[];
  current_result: string;
  is_set_aside: boolean;
  is_assigned?: boolean;
  assigned_to_party_index?: number | null;
};

export type Combination = {
  type:
    | "doublet"
    | "triplet"
    | "quartet"
    | "quintet"
    | "all_for_one"
    | "one_for_all"
    | "full_house";
  elements: string[];
  dice_indices: number[];
  bonuses: Record<string, number>;
};

export type FarkleTurnState = {
  phase:
    | "initial_roll"
    | "set_aside"
    | "rolling_remaining"
    | "ready_to_commit"
    | "done";
  dice: FarkleDie[];
  active_combinations: Combination[];
  accumulated_dice_rush_bonuses?: Record<string, number>;
  accumulated_combination_elements?: string[];
  accumulated_set_aside_elements?: string[];
  is_dice_rush: boolean;
  busted: boolean;
  assignment_required_party_indices?: number[];
  assigned_party_indices?: number[];
  can_commit?: boolean;
};

export type WildEncounterFarkleState = FarkleTurnState & {
  phase:
    | "initial_roll"
    | "set_aside"
    | "rolling_remaining"
    | "ready_to_commit"
    | "done"
    | "resolved";
  detected_combinations: Combination[];
};

export type OpponentTurnResult = {
  dice: FarkleDie[];
  combination: Combination | null;
  set_aside_element_used: boolean;
  bonuses_applied: Record<string, number>;
  deployable_elements: string[];
  combination_elements: string[];
  busted: boolean;
};

export type FarkleBattleState = {
  phase: "targeting" | "player_turn" | "resolved";
  player_party: BattlePartyMember[];
  opponent_party: BattlePartyMember[];
  current_turn: number;
  player_turns_done: number;
  opponent_turns_done: number;
  player_turn: FarkleTurnState | null;
  opponent_turn_result: OpponentTurnResult | null;
  player_bonuses_total: Record<string, number>;
  opponent_bonuses_total: Record<string, number>;
  combat_log: BattleLogEntry[];
  last_player_deployment?: number[];
  last_opponent_deployment?: number[];
  winner?: "player" | "opponent" | "draw";
  player_total_attack?: number;
  opponent_total_attack?: number;
};

// Legacy type kept for backward compatibility
export type BattleRollRecord = {
  turn: number;
  side: "player" | "opponent";
  dice_type_id?: string;
  dice_element: string;
  result_element: string;
  bonus_applied: number;
  affected_element: string;
  roll_value?: number;
};

type PvPData = {
  event_id?: string;
  opponent_id?: string;
  opponent_name: string;
  opponent_power_level: number;
  potential_reward: number;
  opponent_party: BattlePartyMember[];
  player_party: BattlePartyMember[];
  farkle_initialized?: boolean;
  farkle_session_id?: string;
  battle_state?: FarkleBattleState;
};

export type BattleResult = {
  victory: boolean;
  message: string;
  player_total_attack: number;
  opponent_total_attack: number;
  reward?: number;
  penalty?: {
    downgraded_elemental?: string;
  };
  can_continue: boolean;
};

export type FarkleTurnResult = {
  battle_state: FarkleBattleState;
  detected_combinations: Combination[];
  is_busted: boolean;
  is_dice_rush: boolean;
  is_resolved?: boolean;
  result?: BattleResult;
};

export type WildEncounterFarkleTurnResult = {
  farkle_state: WildEncounterFarkleState;
  wild_battle_state?: Record<string, unknown>;
  detected_combinations: Combination[];
  is_busted: boolean;
  is_dice_rush: boolean;
  is_resolved: boolean;
  result?: {
    success: boolean;
    message: string;
    elemental_caught?: {
      id: string;
      name: string;
      level: number;
    };
    can_continue: boolean;
  };
};

type EventData = WildEncounterData | MerchantData | PvPData;
type FarkleSessionEventData = EventData & {
  farkle_session_id?: string;
  farkle_initialized?: boolean;
};
type ApiResponse<T> = { data?: T };
type PostRoute<TBody, TResponse = unknown> = {
  post: (body: TBody) => Promise<ApiResponse<TResponse>>;
};
type GetRoute<TResponse = unknown> = {
  get: (params?: unknown) => Promise<ApiResponse<TResponse>>;
};

type GameApiRoutes = {
  events: {
    options: GetRoute<{ options: EventOptions }>;
    create: PostRoute<
      { player_id: string; event_type: EventType },
      { event: EventResponse }
    >;
    current: Record<string, GetRoute<{ event: EventResponse | null }>>;
  };
  battles: {
    start: PostRoute<
      { player_id: string },
      { battle_state?: FarkleBattleState }
    >;
    farkle: {
      init: PostRoute<
        { player_id: string; event_id: string },
        {
          result?: {
            farkle_session_id: string;
            battle_state?: FarkleBattleState;
          };
        }
      >;
      roll: PostRoute<
        { player_id: string; farkle_session_id: string },
        { result?: FarkleTurnResult }
      >;
      ["set-aside"]: PostRoute<
        {
          player_id: string;
          farkle_session_id: string;
          dice_indices: number[];
        },
        { result?: FarkleTurnResult }
      >;
      assign: PostRoute<
        {
          player_id: string;
          farkle_session_id: string;
          die_index: number;
          party_index: number;
        },
        { result?: FarkleTurnResult }
      >;
      commit: PostRoute<
        { player_id: string; farkle_session_id: string },
        { result?: FarkleTurnResult }
      >;
      ["end-turn"]: PostRoute<
        { player_id: string; farkle_session_id: string },
        { result?: FarkleTurnResult }
      >;
    };
  };
  ["wild-encounters"]: {
    resolve: PostRoute<
      { player_id: string; dice_roll_id: string; item_id?: string },
      { result: { can_continue: boolean } }
    >;
    skip: PostRoute<
      { player_id: string },
      { result: { can_continue: boolean } }
    >;
    farkle: {
      init: PostRoute<
        { player_id: string; event_id: string },
        {
          result?: {
            farkle_session_id: string;
            farkle_state?: WildEncounterFarkleState;
            wild_battle_state?: Record<string, unknown>;
          };
        }
      >;
      roll: PostRoute<
        { player_id: string; farkle_session_id: string },
        { result?: WildEncounterFarkleTurnResult }
      >;
      ["set-aside"]: PostRoute<
        {
          player_id: string;
          farkle_session_id: string;
          dice_indices: number[];
        },
        { result?: WildEncounterFarkleTurnResult }
      >;
      assign: PostRoute<
        {
          player_id: string;
          farkle_session_id: string;
          die_index: number;
          party_index: number;
        },
        { result?: WildEncounterFarkleTurnResult }
      >;
      commit: PostRoute<
        { player_id: string; farkle_session_id: string; item_id?: string },
        { result?: WildEncounterFarkleTurnResult }
      >;
      ["end-turn"]: PostRoute<
        { player_id: string; farkle_session_id: string; item_id?: string },
        { result?: WildEncounterFarkleTurnResult }
      >;
    };
  };
  merchants: {
    leave: PostRoute<
      { player_id: string },
      { result: { can_continue: boolean } }
    >;
  };
};

type EventResponse = {
  event_type: EventType;
  description: string;
  data: EventData;
};

type EventOptions = {
  available: EventType[];
  unavailable: Array<{ event_type: EventType; reason: string }>;
};

export const useEventStore = defineStore(
  "event",
  () => {
    const getApiRoutes = (apiClient: ReturnType<typeof useApi>["api"]) =>
      apiClient.api as unknown as GameApiRoutes;
    // State
    const currentEvent = ref<EventResponse | null>(null);
    const eventHistory = ref<Array<{ event_type: EventType; timestamp: Date }>>(
      [],
    );
    const isEventActive = ref(false);
    const eventOptions = ref<EventOptions | null>(null);

    // Computed
    const eventType = computed(() => currentEvent.value?.event_type ?? null);

    const isWildEncounter = computed(
      () => eventType.value === "wild_encounter",
    );
    const isMerchant = computed(() => eventType.value === "merchant");
    const isPvPBattle = computed(() => eventType.value === "pvp_battle");

    const wildEncounterData = computed(() =>
      isWildEncounter.value
        ? (currentEvent.value?.data as WildEncounterData)
        : null,
    );

    const merchantData = computed(() =>
      isMerchant.value ? (currentEvent.value?.data as MerchantData) : null,
    );

    const pvpData = computed(() =>
      isPvPBattle.value ? (currentEvent.value?.data as PvPData) : null,
    );

    const battleState = computed(() => pvpData.value?.battle_state ?? null);

    async function initFarkleSession(playerId: string) {
      const { api, apiCall } = useApi();
      if (!currentEvent.value) {
        throw new Error("No active event");
      }

      const data = currentEvent.value.data as WildEncounterData | PvPData;
      const eventId = data.event_id;
      if (!eventId) {
        throw new Error("Missing event id");
      }

      const response =
        currentEvent.value.event_type === "pvp_battle"
          ? await apiCall(
              () =>
                getApiRoutes(api).battles.farkle.init.post({
                  player_id: playerId,
                  event_id: eventId,
                }),
              { silent: true },
            )
          : await apiCall(
              () =>
                getApiRoutes(api)["wild-encounters"].farkle.init.post({
                  player_id: playerId,
                  event_id: eventId,
                }),
              { silent: true },
            );

      const result = response.data?.result as
        | {
            farkle_session_id: string;
            battle_state?: FarkleBattleState;
            farkle_state?: WildEncounterFarkleState;
            wild_battle_state?: Record<string, unknown>;
          }
        | undefined;

      if (result?.farkle_session_id) {
        (data as FarkleSessionEventData).farkle_session_id =
          result.farkle_session_id;
        (data as FarkleSessionEventData).farkle_initialized = true;
      }
      if (
        result?.battle_state &&
        currentEvent.value?.event_type === "pvp_battle"
      ) {
        (data as PvPData).battle_state = result.battle_state;
      }
      if (
        result?.farkle_state &&
        currentEvent.value?.event_type === "wild_encounter"
      ) {
        const wildData = data as WildEncounterData;
        wildData.farkle_state = result.farkle_state;
        wildData.wild_battle_state = result.wild_battle_state;
      }

      return result;
    }

    function getFarkleSessionId(): string {
      if (!currentEvent.value) {
        throw new Error("No active event");
      }
      const data = currentEvent.value.data as WildEncounterData | PvPData;
      const sessionId = data.farkle_session_id;
      if (!sessionId) {
        throw new Error("Farkle session is not initialized");
      }
      return sessionId;
    }

    // Actions
    async function getEventOptions() {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(
          () => getApiRoutes(api).events.options.get(),
          { silent: true },
        );
        eventOptions.value = (response.data?.options as EventOptions) ?? null;
        return eventOptions.value;
      } catch (error) {
        console.error("Failed to fetch event options:", error);
        throw error;
      }
    }

    async function createEvent(playerId: string, eventType: EventType) {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(
          () =>
            getApiRoutes(api).events.create.post({
              player_id: playerId,
              event_type: eventType,
            }),
          { silent: false },
        );

        if (response.data) {
          currentEvent.value = response.data.event as EventResponse;
          isEventActive.value = true;

          eventHistory.value.unshift({
            event_type: currentEvent.value.event_type,
            timestamp: new Date(),
          });

          if (eventHistory.value.length > 10) {
            eventHistory.value = eventHistory.value.slice(0, 10);
          }
        }
      } catch (error) {
        console.error("Failed to create event:", error);
        throw error;
      }
    }

    async function resolveWildEncounter(
      playerId: string,
      diceRollId: string,
      itemId?: string,
    ) {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(
          () =>
            getApiRoutes(api)["wild-encounters"].resolve.post({
              player_id: playerId,
              dice_roll_id: diceRollId,
              item_id: itemId,
            }),
          { silent: false },
        );

        if (response.data?.result.can_continue) {
          clearEvent();
        }

        return response.data;
      } catch (error) {
        console.error("Failed to resolve wild encounter:", error);
        throw error;
      }
    }

    async function startBattle(playerId: string) {
      const { api, apiCall } = useApi();

      try {
        if (
          !currentEvent.value ||
          currentEvent.value.event_type !== "pvp_battle"
        ) {
          throw new Error("No active PvP battle");
        }
        const response = await apiCall(
          () => getApiRoutes(api).battles.start.post({ player_id: playerId }),
          { silent: true },
        );
        const state = response.data?.battle_state as
          | FarkleBattleState
          | undefined;
        if (state) {
          const data = currentEvent.value.data as PvPData;
          data.battle_state = state;
        }
        return { battle_state: state };
      } catch (error) {
        console.error("Failed to start battle:", error);
        throw error;
      }
    }

    async function chooseWildSetAsideElement(
      playerId: string,
      _element: string,
    ) {
      try {
        const result = await initFarkleSession(playerId);
        if (currentEvent.value?.event_type === "wild_encounter") {
          const data = currentEvent.value.data as WildEncounterData;
          data.farkle_state = result?.farkle_state as
            | WildEncounterFarkleState
            | undefined;
          data.wild_battle_state = result?.wild_battle_state;
        }
        return {
          farkle_state: result?.farkle_state,
          wild_battle_state: result?.wild_battle_state,
        };
      } catch (error) {
        console.error("Failed to choose wild encounter element:", error);
        throw error;
      }
    }

    async function farkleRoll(playerId: string) {
      const { api, apiCall } = useApi();

      try {
        let sessionId: string;
        try {
          sessionId = getFarkleSessionId();
        } catch {
          const initResult = await initFarkleSession(playerId);
          if (!initResult?.farkle_session_id) {
            throw new Error("Failed to initialize battle session");
          }
          sessionId = initResult.farkle_session_id;
        }
        const response = await apiCall(
          () =>
            getApiRoutes(api).battles.farkle.roll.post({
              player_id: playerId,
              farkle_session_id: sessionId,
            }),
          { silent: true },
        );

        if (response.data?.result?.battle_state && currentEvent.value) {
          const data = currentEvent.value.data as PvPData;
          data.battle_state = response.data.result
            .battle_state as FarkleBattleState;
        }

        return response.data;
      } catch (error) {
        console.error("Failed to roll Farkle dice:", error);
        throw error;
      }
    }

    async function farkleSetAside(playerId: string, diceIndices: number[]) {
      const { api, apiCall } = useApi();

      try {
        let sessionId: string;
        try {
          sessionId = getFarkleSessionId();
        } catch {
          const initResult = await initFarkleSession(playerId);
          if (!initResult?.farkle_session_id) {
            throw new Error("Failed to initialize battle session");
          }
          sessionId = initResult.farkle_session_id;
        }
        const response = await apiCall(
          () =>
            getApiRoutes(api).battles.farkle["set-aside"].post({
              player_id: playerId,
              farkle_session_id: sessionId,
              dice_indices: diceIndices,
            }),
          { silent: true },
        );

        if (response.data?.result?.battle_state && currentEvent.value) {
          const data = currentEvent.value.data as PvPData;
          data.battle_state = response.data.result
            .battle_state as FarkleBattleState;
        }

        return response.data;
      } catch (error) {
        console.error("Failed to set aside dice:", error);
        throw error;
      }
    }

    async function farkleEndTurn(playerId: string) {
      const { api, apiCall } = useApi();

      try {
        let sessionId: string;
        try {
          sessionId = getFarkleSessionId();
        } catch {
          const initResult = await initFarkleSession(playerId);
          if (!initResult?.farkle_session_id) {
            throw new Error("Failed to initialize battle session");
          }
          sessionId = initResult.farkle_session_id;
        }
        const response = await apiCall(
          () =>
            getApiRoutes(api).battles.farkle.commit.post({
              player_id: playerId,
              farkle_session_id: sessionId,
            }),
          { silent: true },
        );

        if (response.data?.result?.battle_state && currentEvent.value) {
          const data = currentEvent.value.data as PvPData;
          data.battle_state = response.data.result
            .battle_state as FarkleBattleState;
        }

        return response.data;
      } catch (error) {
        console.error("Failed to end turn:", error);
        throw error;
      }
    }

    async function farkleAssign(
      playerId: string,
      dieIndex: number,
      partyIndex: number,
    ) {
      const { api, apiCall } = useApi();

      try {
        const sessionId = getFarkleSessionId();
        const response = await apiCall(
          () =>
            getApiRoutes(api).battles.farkle.assign.post({
              player_id: playerId,
              farkle_session_id: sessionId,
              die_index: dieIndex,
              party_index: partyIndex,
            }),
          { silent: true },
        );

        if (response.data?.result?.battle_state && currentEvent.value) {
          const data = currentEvent.value.data as PvPData;
          data.battle_state = response.data.result
            .battle_state as FarkleBattleState;
        }
        return response.data;
      } catch (error) {
        console.error("Failed to assign die:", error);
        throw error;
      }
    }

    async function skipWildEncounter(playerId: string) {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(
          () =>
            getApiRoutes(api)["wild-encounters"].skip.post({
              player_id: playerId,
            }),
          { silent: false, successMessage: "Encounter skipped" },
        );

        if (response.data?.result.can_continue) {
          clearEvent();
        }

        return response.data;
      } catch (error) {
        console.error("Failed to skip wild encounter:", error);
        throw error;
      }
    }

    async function wildEncounterFarkleRoll(playerId: string) {
      const { api, apiCall } = useApi();

      try {
        if (currentEvent.value?.event_type !== "wild_encounter") {
          throw new Error("No active wild encounter");
        }
        const data = currentEvent.value.data as WildEncounterData;
        if (!data.farkle_session_id) {
          const initResult = await initFarkleSession(playerId);
          if (!initResult?.farkle_session_id) {
            throw new Error("Failed to initialize wild encounter session");
          }
        }
        const sessionId = getFarkleSessionId();
        const response = await apiCall(
          () =>
            getApiRoutes(api)["wild-encounters"].farkle.roll.post({
              player_id: playerId,
              farkle_session_id: sessionId,
            }),
          { silent: true },
        );

        if (response.data?.result?.farkle_state && currentEvent.value) {
          const data = currentEvent.value.data as WildEncounterData;
          data.farkle_state = response.data.result
            .farkle_state as WildEncounterFarkleState;
          data.wild_battle_state = response.data.result.wild_battle_state;
        }

        return response.data;
      } catch (error) {
        console.error("Failed wild encounter Farkle roll:", error);
        throw error;
      }
    }

    async function wildEncounterFarkleSetAside(
      playerId: string,
      diceIndices: number[],
    ) {
      const { api, apiCall } = useApi();

      try {
        const sessionId = getFarkleSessionId();
        const response = await apiCall(
          () =>
            getApiRoutes(api)["wild-encounters"].farkle["set-aside"].post({
              player_id: playerId,
              farkle_session_id: sessionId,
              dice_indices: diceIndices,
            }),
          { silent: true },
        );

        if (response.data?.result?.farkle_state && currentEvent.value) {
          const data = currentEvent.value.data as WildEncounterData;
          data.farkle_state = response.data.result
            .farkle_state as WildEncounterFarkleState;
          data.wild_battle_state = response.data.result.wild_battle_state;
        }

        return response.data;
      } catch (error) {
        console.error("Failed wild encounter Farkle set aside:", error);
        throw error;
      }
    }

    async function wildEncounterFarkleAssign(
      playerId: string,
      dieIndex: number,
      partyIndex: number,
    ) {
      const { api, apiCall } = useApi();

      try {
        const sessionId = getFarkleSessionId();
        const response = await apiCall(
          () =>
            getApiRoutes(api)["wild-encounters"].farkle.assign.post({
              player_id: playerId,
              farkle_session_id: sessionId,
              die_index: dieIndex,
              party_index: partyIndex,
            }),
          { silent: true },
        );

        if (response.data?.result?.farkle_state && currentEvent.value) {
          const data = currentEvent.value.data as WildEncounterData;
          data.farkle_state = response.data.result
            .farkle_state as WildEncounterFarkleState;
          data.wild_battle_state = response.data.result.wild_battle_state;
        }

        return response.data;
      } catch (error) {
        console.error("Failed wild encounter Farkle assign:", error);
        throw error;
      }
    }

    async function wildEncounterFarkleEndTurn(
      playerId: string,
      itemId?: string,
    ) {
      const { api, apiCall } = useApi();

      try {
        const sessionId = getFarkleSessionId();
        const response = await apiCall(
          () =>
            getApiRoutes(api)["wild-encounters"].farkle["end-turn"].post({
              player_id: playerId,
              farkle_session_id: sessionId,
              item_id: itemId,
            }),
          { silent: false, successMessage: "Encounter resolved!" },
        );

        if (response.data?.result?.farkle_state && currentEvent.value) {
          const data = currentEvent.value.data as WildEncounterData;
          data.farkle_state = response.data.result
            .farkle_state as WildEncounterFarkleState;
          data.wild_battle_state = response.data.result.wild_battle_state;
        }

        if (response.data?.result?.result?.can_continue) {
          clearEvent();
        }

        return response.data;
      } catch (error) {
        console.error("Failed wild encounter Farkle end turn:", error);
        throw error;
      }
    }

    async function wildEncounterFarkleCommit(
      playerId: string,
      itemId?: string,
    ) {
      const { api, apiCall } = useApi();

      try {
        const sessionId = getFarkleSessionId();
        const response = await apiCall(
          () =>
            getApiRoutes(api)["wild-encounters"].farkle.commit.post({
              player_id: playerId,
              farkle_session_id: sessionId,
              item_id: itemId,
            }),
          { silent: false, successMessage: "Encounter resolved!" },
        );

        if (response.data?.result?.farkle_state && currentEvent.value) {
          const data = currentEvent.value.data as WildEncounterData;
          data.farkle_state = response.data.result
            .farkle_state as WildEncounterFarkleState;
          data.wild_battle_state = response.data.result.wild_battle_state;
        }

        if (response.data?.result?.result?.can_continue) {
          clearEvent();
        }

        return response.data;
      } catch (error) {
        console.error("Failed wild encounter Farkle commit:", error);
        throw error;
      }
    }

    async function leaveMerchant(playerId: string) {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(
          () =>
            getApiRoutes(api).merchants.leave.post({
              player_id: playerId,
            }),
          { silent: false, successMessage: "Left merchant" },
        );

        if (response.data?.result.can_continue) {
          clearEvent();
        }

        return response.data;
      } catch (error) {
        console.error("Failed to leave merchant:", error);
        throw error;
      }
    }

    async function initializeEventState(playerId: string) {
      const { api, apiCall } = useApi();

      try {
        const response = await apiCall(
          () => getApiRoutes(api).events.current[playerId].get(),
          { silent: true },
        );

        if (response.data?.event) {
          currentEvent.value = response.data.event as EventResponse;
          isEventActive.value = true;
          console.log(
            "Restored active event from server:",
            currentEvent.value?.event_type,
          );

          if (currentEvent.value.event_type === "pvp_battle") {
            const data = currentEvent.value.data as PvPData;
            if (
              data.farkle_initialized &&
              data.farkle_session_id &&
              !data.battle_state
            ) {
              await initFarkleSession(playerId);
            }
          }
          if (currentEvent.value.event_type === "wild_encounter") {
            const data = currentEvent.value.data as WildEncounterData;
            if (
              data.farkle_initialized &&
              data.farkle_session_id &&
              !data.farkle_state
            ) {
              await initFarkleSession(playerId);
            }
          }
        } else {
          clearEvent();
        }
      } catch (error) {
        console.error("Failed to initialize event state:", error);
        clearEvent();
      }
    }

    function clearEvent() {
      currentEvent.value = null;
      isEventActive.value = false;
    }

    return {
      // State
      currentEvent,
      eventHistory,
      isEventActive,
      eventOptions,
      // Computed
      eventType,
      isWildEncounter,
      isMerchant,
      isPvPBattle,
      wildEncounterData,
      merchantData,
      pvpData,
      battleState,
      // Actions
      getEventOptions,
      createEvent,
      resolveWildEncounter,
      startBattle,
      chooseWildSetAsideElement,
      farkleRoll,
      farkleSetAside,
      farkleAssign,
      farkleEndTurn,
      skipWildEncounter,
      wildEncounterFarkleRoll,
      wildEncounterFarkleSetAside,
      wildEncounterFarkleAssign,
      wildEncounterFarkleCommit,
      wildEncounterFarkleEndTurn,
      leaveMerchant,
      initializeEventState,
      clearEvent,
    };
  },
  {
    persist: {
      key: "elementary-dices-event",
      storage: localStorage,
      paths: ["currentEvent", "isEventActive"],
    },
  },
);
