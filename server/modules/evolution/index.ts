import { Elysia, t } from 'elysia';
import { EvolutionService } from './service';
import { CombineElementalsDTO } from './models';

export const evolutionModule = new Elysia({ prefix: '/api/evolution' })
  .decorate('evolutionService', new EvolutionService())
  // Get all evolution recipes
  .get('/', async ({ evolutionService }) => {
    const recipes = await evolutionService.findAll();
    return { recipes };
  })
  // Get evolution recipe by ID
  .get(
    '/:id',
    async ({ params, evolutionService }) => {
      const recipe = await evolutionService.findById(params.id);
      return { recipe };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Get player's discovered recipes
  .get(
    '/players/:playerId/discovered',
    async ({ params, evolutionService }) => {
      const recipes = await evolutionService.getPlayerDiscoveries(params.playerId);
      return { recipes };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )
  // Combine elementals to evolve
  .post(
    '/combine',
    async ({ body, evolutionService }) => {
      const result = await evolutionService.combineElementals(body);
      return result;
    },
    {
      body: CombineElementalsDTO,
    }
  );
