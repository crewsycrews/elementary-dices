import { Elysia, t } from "elysia";
import { EvolutionService } from "./service";
import { CombineElementalsDTO } from "./models";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import type { AccessTokenPayload } from "../auth/models";
import { resolveLocale } from "../../shared/i18n";

export const evolutionModule = new Elysia({ prefix: "/api/evolution" })
  .derive(({ headers }) => ({
    locale: resolveLocale(headers as Record<string, string | undefined>),
  }))
  .decorate("evolutionService", new EvolutionService())

  // Public routes (recipe catalog)
  // Get all evolution recipes
  .get("/", async ({ evolutionService }) => {
    const recipes = await evolutionService.findAll();
    return { recipes };
  })
  // Get evolution recipe by ID
  .get(
    "/:id",
    async ({ params, evolutionService }) => {
      const recipe = await evolutionService.findById(params.id);
      return { recipe };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // Protected routes
  .use(requireAuth)

  // Get player's discovered recipes
  .get(
    "/players/:playerId/discovered",
    async (context) => {
      const { params, evolutionService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only view your own discoveries");
      }
      const recipes = await evolutionService.getPlayerDiscoveries(
        params.playerId,
      );
      return { recipes };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    },
  )
  // Combine elementals to evolve
  .post(
    "/combine",
    async (context) => {
      const { body, locale, evolutionService } = context;
      const user = context.user;

      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only combine your own elementals");
      }
      const result = await evolutionService.combineElementals(body, locale);
      return result;
    },
    {
      body: CombineElementalsDTO,
    },
  );
