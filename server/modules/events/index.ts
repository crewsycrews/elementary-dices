import { Elysia } from "elysia";
import { EventService } from "./service";
import {
  TriggerEventDTO,
  ResolveWildEncounterDTO,
  SkipWildEncounterDTO,
  ResolvePvPBattleDTO,
  LeaveMerchantDTO,
} from "./models";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import type { AccessTokenPayload } from "../auth/models";

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
  // Resolve PvP battle
  .post(
    "/pvp-battle/resolve",
    async (context) => {
      const { body, eventService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only resolve your own battles");
      }
      const result = await eventService.resolvePvPBattle(body);
      return { result };
    },
    {
      body: ResolvePvPBattleDTO,
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
