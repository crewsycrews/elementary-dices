import { Elysia, t } from 'elysia';
import { DiceService } from './service';
import {
  CreateDiceTypeDTO,
  UpdateDiceTypeDTO,
  AddPlayerDiceDTO,
  DiceTypeQueryDTO,
} from './models';

export const diceModule = new Elysia({ prefix: '/api/dice' })
  .decorate('diceService', new DiceService())
  // ===== Dice Types Routes =====
  // Get all dice types with optional filters
  .get(
    '/types',
    async ({ query, diceService }) => {
      const diceTypes = await diceService.findAllDiceTypes(query);
      return { diceTypes };
    },
    {
      query: DiceTypeQueryDTO,
    }
  )
  // Get dice types by rarity
  .get(
    '/types/rarity/:rarity',
    async ({ params, diceService }) => {
      const diceTypes = await diceService.findDiceTypesByRarity(params.rarity);
      return { diceTypes };
    },
    {
      params: t.Object({
        rarity: t.String(),
      }),
    }
  )
  // Get dice type by ID
  .get(
    '/types/:id',
    async ({ params, diceService }) => {
      const diceType = await diceService.findDiceTypeById(params.id);
      return { diceType };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Create new dice type
  .post(
    '/types',
    async ({ body, diceService }) => {
      const diceType = await diceService.createDiceType(body);
      return { diceType };
    },
    {
      body: CreateDiceTypeDTO,
    }
  )
  // Update dice type
  .patch(
    '/types/:id',
    async ({ params, body, diceService }) => {
      const diceType = await diceService.updateDiceType(params.id, body);
      return { diceType };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateDiceTypeDTO,
    }
  )
  // Delete dice type
  .delete(
    '/types/:id',
    async ({ params, diceService }) => {
      await diceService.deleteDiceType(params.id);
      return { message: 'Dice type deleted successfully' };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // ===== Player Dice Routes =====
  // Get all dice for a player
  .get(
    '/players/:playerId',
    async ({ params, diceService }) => {
      const dice = await diceService.findPlayerDice(params.playerId);
      return { dice };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )
  // Get equipped dice for a player (returns first equipped dice)
  .get(
    '/players/:playerId/equipped',
    async ({ params, diceService }) => {
      const dice = await diceService.findEquippedDice(params.playerId);
      return { dice };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )
  // Get all equipped dice for a player (returns array of 5 dice)
  .get(
    '/players/:playerId/equipped/all',
    async ({ params, diceService }) => {
      const dice = await diceService.findAllEquippedDice(params.playerId);
      return { dice };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )
  // Add dice to player inventory
  .post(
    '/players/:playerId',
    async ({ params, body, diceService }) => {
      const dice = await diceService.addPlayerDice(params.playerId, body);
      return { dice };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
      body: AddPlayerDiceDTO,
    }
  )
  // Equip a dice
  .patch(
    '/players/:playerId/:diceId/equip',
    async ({ params, diceService }) => {
      const dice = await diceService.equipDice(params.diceId, params.playerId);
      return { dice };
    },
    {
      params: t.Object({
        playerId: t.String(),
        diceId: t.String(),
      }),
    }
  )
  // Unequip a dice
  .patch(
    '/players/:playerId/:diceId/unequip',
    async ({ params, diceService }) => {
      const dice = await diceService.unequipDice(params.diceId, params.playerId);
      return { dice };
    },
    {
      params: t.Object({
        playerId: t.String(),
        diceId: t.String(),
      }),
    }
  )
  // Delete player dice
  .delete(
    '/players/:playerId/:diceId',
    async ({ params, diceService }) => {
      await diceService.deletePlayerDice(params.diceId, params.playerId);
      return { message: 'Dice removed from inventory' };
    },
    {
      params: t.Object({
        playerId: t.String(),
        diceId: t.String(),
      }),
    }
  );
