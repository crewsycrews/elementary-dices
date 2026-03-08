import { Elysia } from "elysia";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import { EventsOrchestratorService } from "./orchestrator-service";
import { CreateEventDTO } from "./models/shared";

export const eventsModule = new Elysia({ prefix: "/api/events" })
  .decorate("eventsOrchestratorService", new EventsOrchestratorService())
  .use(requireAuth)
  .get("/options", async ({ user, eventsOrchestratorService }) => {
    const options = await eventsOrchestratorService.getEventOptions(user.id);
    return { options };
  })
  .get("/current/:playerId", async ({ params, user, eventsOrchestratorService }) => {
    if (user.id !== params.playerId) {
      throw new UnauthorizedError("You can only view your own events");
    }
    const event = await eventsOrchestratorService.getCurrentEvent(params.playerId);
    return { event };
  })
  .post(
    "/create",
    async ({ body, user, eventsOrchestratorService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only create events for yourself");
      }
      const event = await eventsOrchestratorService.createEvent(body);
      return { event };
    },
    { body: CreateEventDTO },
  );
