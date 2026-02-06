import { Elysia, t } from 'elysia';
import { DiceRollService } from './service';
import { PerformRollDTO } from './models';

export const diceRollsModule = new Elysia({ prefix: '/api/rolls' })
  .decorate('rollService', new DiceRollService())
  // Perform a dice roll
  .post(
    '/',
    async ({ body, rollService }) => {
      const result = await rollService.performRoll(body);
      return result;
    },
    {
      body: PerformRollDTO,
    }
  )
  // Get roll by ID
  .get(
    '/:id',
    async ({ params, rollService }) => {
      const roll = await rollService.findById(params.id);
      return { roll };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Get player's roll history
  .get(
    '/players/:playerId',
    async ({ params, query, rollService }) => {
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
    }
  )
  // Get player roll statistics
  .get(
    '/players/:playerId/stats',
    async ({ params, rollService }) => {
      const stats = await rollService.getPlayerStats(params.playerId);
      return stats;
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )
  // Get rolls by battle
  .get(
    '/battles/:battleId',
    async ({ params, rollService }) => {
      const rolls = await rollService.getBattleRolls(params.battleId);
      return { rolls };
    },
    {
      params: t.Object({
        battleId: t.String(),
      }),
    }
  );
