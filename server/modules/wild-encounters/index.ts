import { Elysia } from "elysia";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import { WildEncounterService } from "./service";
import {
  ResolveWildEncounterDTO,
  SkipWildEncounterDTO,
  FarkleInitDTO,
  GenericFarkleRollDTO,
  GenericFarkleSetAsideDTO,
  GenericFarkleAssignDTO,
  GenericFarkleEndTurnDTO,
} from "../events/models/wild-encounter";
import { resolveLocale } from "../../shared/i18n";

export const wildEncountersModule = new Elysia({ prefix: "/api/wild-encounters" })
  .derive(({ headers }) => ({
    locale: resolveLocale(headers as Record<string, string | undefined>),
  }))
  .decorate("wildEncounterService", new WildEncounterService())
  .use(requireAuth)
  .post(
    "/resolve",
    async ({ body, user, locale, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only resolve your own encounters");
      }
      const result = await wildEncounterService.resolveWildEncounter(body, locale);
      return { result };
    },
    { body: ResolveWildEncounterDTO },
  )
  .post(
    "/skip",
    async ({ body, user, locale, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only skip your own encounters");
      }
      const result = await wildEncounterService.skipWildEncounter(body.player_id, locale);
      return { result };
    },
    { body: SkipWildEncounterDTO },
  )
  .post(
    "/farkle/init",
    async ({ body, user, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only init your own encounters");
      }
      const result = await wildEncounterService.farkleInit(
        body.player_id,
        body.event_id,
      );
      return { result };
    },
    { body: FarkleInitDTO },
  )
  .post(
    "/farkle/roll",
    async ({ body, user, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only roll in your own encounters");
      }
      const result = await wildEncounterService.farkleRoll(
        body.player_id,
        body.farkle_session_id,
      );
      return { result };
    },
    { body: GenericFarkleRollDTO },
  )
  .post(
    "/farkle/set-aside",
    async ({ body, user, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only set aside in your own encounters");
      }
      const result = await wildEncounterService.farkleSetAside(
        body.player_id,
        body.farkle_session_id,
        body.dice_indices,
      );
      return { result };
    },
    { body: GenericFarkleSetAsideDTO },
  )
  .post(
    "/farkle/assign",
    async ({ body, user, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only assign in your own encounters");
      }
      const result = await wildEncounterService.farkleAssign(
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
    async ({ body, user, locale, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only end your own encounter turn");
      }
      const result = await wildEncounterService.farkleEndTurn(
        body.player_id,
        body.farkle_session_id,
        locale,
        body.item_id,
      );
      return { result };
    },
    { body: GenericFarkleEndTurnDTO },
  )
  .post(
    "/farkle/end-turn",
    async ({ body, user, locale, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only end your own encounter turn");
      }
      const result = await wildEncounterService.farkleEndTurn(
        body.player_id,
        body.farkle_session_id,
        locale,
        body.item_id,
      );
      return { result };
    },
    { body: GenericFarkleEndTurnDTO },
  );
