import { Elysia } from 'elysia';
import { EventService } from './service';
import {
  TriggerEventDTO,
  ResolveWildEncounterDTO,
  SkipWildEncounterDTO,
  ResolvePvPBattleDTO,
  LeaveMerchantDTO,
} from './models';

export const eventsModule = new Elysia({ prefix: '/api/events' })
  .decorate('eventService', new EventService())
  // Get current active event for a player
  .get(
    '/current/:playerId',
    async ({ params, eventService }) => {
      const event = await eventService.getCurrentEvent(params.playerId);
      return { event };
    }
  )
  // Trigger a random event for a player
  .post(
    '/trigger',
    async ({ body, eventService }) => {
      const event = await eventService.triggerEvent(body.player_id);
      return { event };
    },
    {
      body: TriggerEventDTO,
    }
  )
  // Get event probabilities
  .get('/probabilities', async ({ eventService }) => {
    const probabilities = eventService.getEventProbabilities();
    return { probabilities };
  })
  // Resolve wild encounter
  .post(
    '/wild-encounter/resolve',
    async ({ body, eventService }) => {
      const result = await eventService.resolveWildEncounter(body);
      return { result };
    },
    {
      body: ResolveWildEncounterDTO,
    }
  )
  // Skip wild encounter
  .post(
    '/wild-encounter/skip',
    async ({ body, eventService }) => {
      const result = await eventService.skipWildEncounter(body.player_id);
      return { result };
    },
    {
      body: SkipWildEncounterDTO,
    }
  )
  // Resolve PvP battle
  .post(
    '/pvp-battle/resolve',
    async ({ body, eventService }) => {
      const result = await eventService.resolvePvPBattle(body);
      return { result };
    },
    {
      body: ResolvePvPBattleDTO,
    }
  )
  // Leave merchant
  .post(
    '/merchant/leave',
    async ({ body, eventService }) => {
      const result = await eventService.leaveMerchant(body.player_id);
      return { result };
    },
    {
      body: LeaveMerchantDTO,
    }
  );
