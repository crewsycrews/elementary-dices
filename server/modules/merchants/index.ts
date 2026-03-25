import { Elysia } from "elysia";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import { MerchantService } from "./service";
import { LeaveMerchantDTO } from "../events/models/merchant";
import { resolveLocale } from "../../shared/i18n";

export const merchantsModule = new Elysia({ prefix: "/api/merchants" })
  .derive(({ headers }) => ({
    locale: resolveLocale(headers as Record<string, string | undefined>),
  }))
  .decorate("merchantService", new MerchantService())
  .use(requireAuth)
  .post(
    "/leave",
    async ({ body, user, locale, merchantService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only leave your own merchant");
      }
      const result = await merchantService.leaveMerchant(body.player_id, locale);
      return { result };
    },
    { body: LeaveMerchantDTO },
  );
