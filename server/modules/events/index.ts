import { Elysia } from "elysia";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import { EventsOrchestratorService } from "./orchestrator-service";
import { CreateEventDTO } from "./models/shared";
import { resolveLocale } from "../../shared/i18n";

export const eventsModule = new Elysia({ prefix: "/api/events" })
  .derive(({ headers }) => ({
    locale: resolveLocale(headers as Record<string, string | undefined>),
  }))
  .decorate("eventsOrchestratorService", new EventsOrchestratorService())
  .use(requireAuth)
  .get("/options", async ({ user, locale, eventsOrchestratorService }) => {
    const options = await eventsOrchestratorService.getEventOptions(user.id, locale);
    return { options };
  })
  .get("/current/:playerId", async ({ params, user, locale, eventsOrchestratorService }) => {
    if (user.id !== params.playerId) {
      throw new UnauthorizedError("You can only view your own events");
    }
    const event = await eventsOrchestratorService.getCurrentEvent(params.playerId, locale);
    return { event };
  })
  .post(
    "/create",
    async ({ body, user, locale, eventsOrchestratorService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only create events for yourself");
      }
      const event = await eventsOrchestratorService.createEvent(body, locale);
      return { event };
    },
    { body: CreateEventDTO },
  );
