import { Elysia, t } from 'elysia';
import { PlayerElementalsService } from './service';
import {
  AddPlayerElementalDTO,
  UpdatePlayerElementalDTO,
} from './models';

export const playerElementalsModule = new Elysia({ prefix: '/api/players' })
  .decorate('playerElementalsService', new PlayerElementalsService())

  // Start game - Roll d4 to get first elemental
  .post(
    '/:playerId/start-game',
    async ({ params, playerElementalsService }) => {
      const result = await playerElementalsService.startGame({
        player_id: params.playerId,
      });
      return result;
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )

  // Get all elementals for a player
  .get(
    '/:playerId/elementals',
    async ({ params, playerElementalsService }) => {
      const elementals = await playerElementalsService.findByPlayerId(params.playerId);
      return { elementals };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )

  // Get active party for a player
  .get(
    '/:playerId/elementals/party',
    async ({ params, playerElementalsService }) => {
      const party = await playerElementalsService.getActiveParty(params.playerId);
      return { party };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )

  // Get backpack for a player
  .get(
    '/:playerId/elementals/backpack',
    async ({ params, playerElementalsService }) => {
      const backpack = await playerElementalsService.getBackpack(params.playerId);
      return { backpack };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )

  // Add elemental to player's collection
  .post(
    '/:playerId/elementals',
    async ({ params, body, playerElementalsService }) => {
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
      body: t.Omit(AddPlayerElementalDTO, ['player_id']),
    }
  )

  // Update player elemental
  .patch(
    '/:playerId/elementals/:elementalId',
    async ({ params, body, playerElementalsService }) => {
      const elemental = await playerElementalsService.update(params.elementalId, body);
      return { elemental };
    },
    {
      params: t.Object({
        playerId: t.String(),
        elementalId: t.String(),
      }),
      body: UpdatePlayerElementalDTO,
    }
  )

  // Delete player elemental
  .delete(
    '/:playerId/elementals/:elementalId',
    async ({ params, playerElementalsService }) => {
      await playerElementalsService.remove(params.elementalId);
      return { message: 'Elemental removed from collection' };
    },
    {
      params: t.Object({
        playerId: t.String(),
        elementalId: t.String(),
      }),
    }
  )

  // Swap party positions
  .post(
    '/:playerId/elementals/swap',
    async ({ params, body, playerElementalsService }) => {
      const result = await playerElementalsService.swapPartyPositions(
        params.playerId,
        body.position1,
        body.position2
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
    }
  );
