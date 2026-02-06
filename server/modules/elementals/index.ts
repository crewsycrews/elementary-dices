import { Elysia, t } from 'elysia';
import { ElementalService } from './service';
import {
  CreateElementalDTO,
  UpdateElementalDTO,
  ElementalQueryDTO,
} from './models';

export const elementalsModule = new Elysia({ prefix: '/api/elementals' })
  .decorate('elementalService', new ElementalService())
  // Get all elementals with optional filters
  .get(
    '/',
    async ({ query, elementalService }) => {
      const elementals = await elementalService.findAll(query);
      return { elementals };
    },
    {
      query: ElementalQueryDTO,
    }
  )
  // Get stats about elementals
  .get('/stats', async ({ elementalService }) => {
    const stats = await elementalService.getStats();
    return stats;
  })
  // Get base elementals only
  .get('/base', async ({ elementalService }) => {
    const elementals = await elementalService.findBaseElementals();
    return { elementals };
  })
  // Get elementals by level
  .get(
    '/level/:level',
    async ({ params, elementalService }) => {
      const level = parseInt(params.level);
      const elementals = await elementalService.findByLevel(level);
      return { elementals };
    },
    {
      params: t.Object({
        level: t.String(),
      }),
    }
  )
  // Get elementals by element type
  .get(
    '/element/:type',
    async ({ params, elementalService }) => {
      const elementals = await elementalService.findByElementType(params.type);
      return { elementals };
    },
    {
      params: t.Object({
        type: t.String(),
      }),
    }
  )
  // Get elemental by ID
  .get(
    '/:id',
    async ({ params, elementalService }) => {
      const elemental = await elementalService.findById(params.id);
      return { elemental };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Create new elemental
  .post(
    '/',
    async ({ body, elementalService }) => {
      const elemental = await elementalService.create(body);
      return { elemental };
    },
    {
      body: CreateElementalDTO,
    }
  )
  // Update elemental
  .patch(
    '/:id',
    async ({ params, body, elementalService }) => {
      const elemental = await elementalService.update(params.id, body);
      return { elemental };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateElementalDTO,
    }
  )
  // Delete elemental
  .delete(
    '/:id',
    async ({ params, elementalService }) => {
      await elementalService.delete(params.id);
      return { message: 'Elemental deleted successfully' };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
