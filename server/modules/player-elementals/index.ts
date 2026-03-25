import { Elysia, t } from "elysia";
import { PlayerElementalsService } from "./service";
import { AddPlayerElementalDTO, UpdatePlayerElementalDTO } from "./models";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import type { AccessTokenPayload } from "../auth/models";
import { resolveLocale } from "../../shared/i18n";

export const playerElementalsModule = new Elysia({ prefix: "/api/players" })
  .derive(({ headers }) => ({
    locale: resolveLocale(headers as Record<string, string | undefined>),
  }))
  .use(requireAuth)
  .decorate("playerElementalsService", new PlayerElementalsService())
  // Start game - Roll d4 to get first elemental
  .post(
    "/:playerId/start-game",
    async (context) => {
      const { params, locale, playerElementalsService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only start your own game");
      }
      const result = await playerElementalsService.startGame({
        player_id: params.playerId,
      }, locale);
      return result;
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    },
  )

  // Get all elementals for a player
  .get(
    "/:playerId/elementals",
    async (context) => {
      const { params, playerElementalsService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only view your own elementals");
      }
      const elementals = await playerElementalsService.findByPlayerId(
        params.playerId,
      );
      return { elementals };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    },
  )

  // Get active party for a player
  .get(
    "/:playerId/elementals/party",
    async (context) => {
      const { params, playerElementalsService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only view your own party");
      }
      const party = await playerElementalsService.getActiveParty(
        params.playerId,
      );
      return { party };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    },
  )

  // Get backpack for a player
  .get(
    "/:playerId/elementals/backpack",
    async (context) => {
      const { params, playerElementalsService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only view your own backpack");
      }
      const backpack = await playerElementalsService.getBackpack(
        params.playerId,
      );
      return { backpack };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    },
  )

  // Add elemental to player's collection
  .post(
    "/:playerId/elementals",
    async (context) => {
      const { params, body, playerElementalsService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError(
          "You can only add elementals to your own collection",
        );
      }
      const elemental = await playerElementalsService.add({
        ...body,
        player_id: params.playerId,
      });
      return { elemental };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
      body: t.Omit(AddPlayerElementalDTO, ["player_id"]),
    },
  )

  // Update player elemental
  .patch(
    "/:playerId/elementals/:elementalId",
    async (context) => {
      const { params, body, playerElementalsService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only update your own elementals");
      }
      const elemental = await playerElementalsService.update(
        params.elementalId,
        body,
      );
      return { elemental };
    },
    {
      params: t.Object({
        playerId: t.String(),
        elementalId: t.String(),
      }),
      body: UpdatePlayerElementalDTO,
    },
  )

  // Delete player elemental
  .delete(
    "/:playerId/elementals/:elementalId",
    async (context) => {
      const { params, playerElementalsService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only remove your own elementals");
      }
      await playerElementalsService.remove(params.elementalId);
      return { message: "Elemental removed from collection" };
    },
    {
      params: t.Object({
        playerId: t.String(),
        elementalId: t.String(),
      }),
    },
  )

  // Swap party positions
  .post(
    "/:playerId/elementals/swap",
    async (context) => {
      const { params, body, playerElementalsService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError(
          "You can only swap positions in your own party",
        );
      }
      const result = await playerElementalsService.swapPartyPositions(
        params.playerId,
        body.position1,
        body.position2,
      );
      return result;
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
      body: t.Object({
        position1: t.Number({ minimum: 1, maximum: 5 }),
        position2: t.Number({ minimum: 1, maximum: 5 }),
      }),
    },
  );
