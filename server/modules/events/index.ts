import { Elysia, t } from 'elysia';
import { EventService } from './service';
import { TriggerEventDTO } from './models';

export const eventsModule = new Elysia({ prefix: '/api/events' })
  .decorate('eventService', new EventService())
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
  });
