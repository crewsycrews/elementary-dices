import { Elysia, t } from "elysia";
import { DiceRollService } from "./service";
import { PerformRollDTO } from "./models";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import type { AccessTokenPayload } from "../auth/models";

export const diceRollsModule = new Elysia({ prefix: "/api/rolls" })
  .use(requireAuth)
  .decorate("rollService", new DiceRollService())
  // Perform a dice roll
  .post(
    "/",
    async (context) => {
      const { body, rollService } = context;
      const user = context.user;

      // Verify the player_id in the body matches the authenticated user
      if (body.player_id && body.player_id !== user.id) {
        throw new UnauthorizedError("You can only perform rolls for yourself");
      }
      const result = await rollService.performRoll(body);
      return result;
    },
    {
      body: PerformRollDTO,
    },
  )
  // Get roll by ID
  .get(
    "/:id",
    async (context) => {
      const { params, rollService } = context;
      const roll = await rollService.findById(params.id);
      return { roll };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  // Get player's roll history
  .get(
    "/players/:playerId",
    async (context) => {
      const { params, query, rollService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only view your own roll history");
      }
      const limit = query.limit ? parseInt(query.limit) : 50;
      const rolls = await rollService.getPlayerRolls(params.playerId, limit);
      return { rolls };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
    },
  )
  // Get player roll statistics
  .get(
    "/players/:playerId/stats",
    async (context) => {
      const { params, rollService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError(
          "You can only view your own roll statistics",
        );
      }
      const stats = await rollService.getPlayerStats(params.playerId);
      return stats;
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    },
  )
;
