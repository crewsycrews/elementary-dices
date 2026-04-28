import { Elysia } from "elysia";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import { BattleService } from "./service";
import {
  BattleStartDTO,
  FarkleInitDTO,
  GenericFarkleRollDTO,
  GenericFarkleEndTurnDTO,
  GenericFarkleAssignDTO,
} from "../events/models/battle";
import { resolveLocale } from "../../shared/i18n";

export const battlesModule = new Elysia({ prefix: "/api/battles" })
  .derive(({ headers }) => ({
    locale: resolveLocale(headers as Record<string, string | undefined>),
  }))
  .decorate("battleService", new BattleService())
  .use(requireAuth)
  .post(
    "/start",
    async ({ body, user, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only start your own battles");
      }
      const battleState = await battleService.startBattle(body.player_id);
      return { battle_state: battleState };
    },
    { body: BattleStartDTO },
  )
  .post(
    "/farkle/init",
    async ({ body, user, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only init your own battles");
      }
      const result = await battleService.farkleInit(
        body.player_id,
        body.event_id,
      );
      return { result };
    },
    { body: FarkleInitDTO },
  )
  .post(
    "/farkle/roll",
    async ({ body, user, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only roll in your own battles");
      }
      const result = await battleService.farkleRoll(
        body.player_id,
        body.farkle_session_id,
      );
      return { result };
    },
    { body: GenericFarkleRollDTO },
  )
  .post(
    "/farkle/assign",
    async ({ body, user, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only assign in your own battles");
      }
      const result = await battleService.farkleAssign(
        body.player_id,
        body.farkle_session_id,
        body.die_index,
        body.party_index,
      );
      return { result };
    },
    { body: GenericFarkleAssignDTO },
  )
  .post(
    "/farkle/commit",
    async ({ body, user, locale, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only commit your own battle turn");
      }
      const result = await battleService.farkleEndTurn(
        body.player_id,
        body.farkle_session_id,
        locale,
      );
      return { result };
    },
    { body: GenericFarkleEndTurnDTO },
  )
  // backward-compatible alias
  .post(
    "/farkle/end-turn",
    async ({ body, user, locale, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only commit your own battle turn");
      }
      const result = await battleService.farkleEndTurn(
        body.player_id,
        body.farkle_session_id,
        locale,
      );
      return { result };
    },
    { body: GenericFarkleEndTurnDTO },
  );
