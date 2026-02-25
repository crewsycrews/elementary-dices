import { Elysia } from "elysia";
import { EventService } from "./service";
import {
  TriggerEventDTO,
  ResolveWildEncounterDTO,
  SkipWildEncounterDTO,
  BattleStartDTO,
  LeaveMerchantDTO,
  ChooseElementDTO,
  FarkleRerollDTO,
  FarkleSetAsideDTO,
  FarkleContinueDTO,
  FarkleEndTurnDTO,
} from "./models";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";

export const eventsModule = new Elysia({ prefix: "/api/events" })
  .decorate("eventService", new EventService())

  // Public routes
  // Get event probabilities (public for game info)
  .get("/probabilities", async ({ eventService }) => {
    const probabilities = eventService.getEventProbabilities();
    return { probabilities };
  })

  // Protected routes
  .use(requireAuth)

  // Get current active event for a player
  .get("/current/:playerId", async (context) => {
    const { params, eventService } = context;
    const user = context.user;

    if (user.id !== params.playerId) {
      throw new UnauthorizedError("You can only view your own events");
    }
    const event = await eventService.getCurrentEvent(params.playerId);
    return { event };
  })
  // Trigger a random event for a player
  .post(
    "/trigger",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only trigger events for yourself");
      }
      const event = await eventService.triggerEvent(body.player_id);
      return { event };
    },
    {
      body: TriggerEventDTO,
    },
  )
  // Resolve wild encounter
  .post(
    "/wild-encounter/resolve",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only resolve your own encounters");
      }
      const result = await eventService.resolveWildEncounter(body);
      return { result };
    },
    {
      body: ResolveWildEncounterDTO,
    },
  )
  // Skip wild encounter
  .post(
    "/wild-encounter/skip",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only skip your own encounters");
      }
      const result = await eventService.skipWildEncounter(body.player_id);
      return { result };
    },
    {
      body: SkipWildEncounterDTO,
    },
  )
  // Start PvP battle (transition from targeting to choose_element phase)
  .post(
    "/pvp-battle/start",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only start your own battles");
      }
      const battleState = await eventService.startBattle(body.player_id);
      return { battle_state: battleState };
    },
    {
      body: BattleStartDTO,
    },
  )
  // Choose set-aside element (once, before turn 1)
  .post(
    "/pvp-battle/choose-element",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only choose for your own battles");
      }
      const battleState = await eventService.chooseSetAsideElement(
        body.player_id,
        body.element as any,
      );
      return { battle_state: battleState };
    },
    {
      body: ChooseElementDTO,
    },
  )
  // Initial Farkle roll (all 5 dice)
  .post(
    "/pvp-battle/roll",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only roll in your own battles");
      }
      const result = await eventService.farkleInitialRoll(body.player_id);
      return { result };
    },
    {
      body: FarkleContinueDTO,
    },
  )
  // Free reroll (1-5 dice, once per turn)
  .post(
    "/pvp-battle/reroll",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only reroll in your own battles");
      }
      const result = await eventService.farkleReroll(
        body.player_id,
        body.dice_indices_to_reroll,
      );
      return { result };
    },
    {
      body: FarkleRerollDTO,
    },
  )
  // Set aside a combination (or chosen-element die)
  .post(
    "/pvp-battle/set-aside",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only set aside in your own battles");
      }
      const result = await eventService.farkleSetAside(
        body.player_id,
        body.dice_indices,
        body.one_for_all_element,
      );
      return { result };
    },
    {
      body: FarkleSetAsideDTO,
    },
  )
  // Roll remaining (non-set-aside) dice
  .post(
    "/pvp-battle/continue",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only continue in your own battles");
      }
      const result = await eventService.farkleContinue(body.player_id);
      return { result };
    },
    {
      body: FarkleContinueDTO,
    },
  )
  // End player turn (apply bonuses, run opponent AI, advance turn counter)
  .post(
    "/pvp-battle/end-turn",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only end your own turn");
      }
      const result = await eventService.farkleEndTurn(body.player_id);
      return { result };
    },
    {
      body: FarkleEndTurnDTO,
    },
  )
  // Leave merchant
  .post(
    "/merchant/leave",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only leave your own merchant");
      }
      const result = await eventService.leaveMerchant(body.player_id);
      return { result };
    },
    {
      body: LeaveMerchantDTO,
    },
  );
