import { Elysia } from "elysia";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import { MerchantService } from "./service";
import { LeaveMerchantDTO } from "../events/models/merchant";

export const merchantsModule = new Elysia({ prefix: "/api/merchants" })
  .decorate("merchantService", new MerchantService())
  .use(requireAuth)
  .post(
    "/leave",
    async ({ body, user, merchantService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only leave your own merchant");
      }
      const result = await merchantService.leaveMerchant(body.player_id);
      return { result };
    },
    { body: LeaveMerchantDTO },
  );
