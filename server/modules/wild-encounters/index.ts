import { Elysia } from "elysia";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import { WildEncounterService } from "./service";
import {
  ResolveWildEncounterDTO,
  SkipWildEncounterDTO,
  FarkleInitDTO,
  GenericFarkleRollDTO,
  GenericFarkleRerollDTO,
  GenericFarkleSetAsideDTO,
  GenericFarkleContinueDTO,
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
        body.set_aside_element,
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
    "/farkle/reroll",
    async ({ body, user, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only reroll in your own encounters");
      }
      const result = await wildEncounterService.farkleReroll(
        body.player_id,
        body.farkle_session_id,
        body.dice_indices_to_reroll,
      );
      return { result };
    },
    { body: GenericFarkleRerollDTO },
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
        body.one_for_all_element,
      );
      return { result };
    },
    { body: GenericFarkleSetAsideDTO },
  )
  .post(
    "/farkle/continue",
    async ({ body, user, wildEncounterService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only continue your own encounters");
      }
      const result = await wildEncounterService.farkleContinue(
        body.player_id,
        body.farkle_session_id,
      );
      return { result };
    },
    { body: GenericFarkleContinueDTO },
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
