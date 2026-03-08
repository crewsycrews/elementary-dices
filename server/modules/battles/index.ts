import { Elysia } from "elysia";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import { BattleService } from "./service";
import {
  BattleStartDTO,
  ChooseElementDTO,
  FarkleInitDTO,
  GenericFarkleRollDTO,
  GenericFarkleRerollDTO,
  GenericFarkleSetAsideDTO,
  GenericFarkleContinueDTO,
  GenericFarkleEndTurnDTO,
} from "../events/models/battle";

export const battlesModule = new Elysia({ prefix: "/api/battles" })
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
    "/choose-element",
    async ({ body, user, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only choose for your own battles");
      }
      const battleState = await battleService.chooseSetAsideElement(
        body.player_id,
        body.element,
      );
      return { battle_state: battleState };
    },
    { body: ChooseElementDTO },
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
        body.set_aside_element,
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
    "/farkle/reroll",
    async ({ body, user, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only reroll in your own battles");
      }
      const result = await battleService.farkleReroll(
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
    async ({ body, user, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only set aside in your own battles");
      }
      const result = await battleService.farkleSetAside(
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
    async ({ body, user, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only continue your own battles");
      }
      const result = await battleService.farkleContinue(
        body.player_id,
        body.farkle_session_id,
      );
      return { result };
    },
    { body: GenericFarkleContinueDTO },
  )
  .post(
    "/farkle/end-turn",
    async ({ body, user, battleService }) => {
      if (user.id !== body.player_id) {
        throw new UnauthorizedError("You can only end your own battle turn");
      }
      const result = await battleService.farkleEndTurn(
        body.player_id,
        body.farkle_session_id,
      );
      return { result };
    },
    { body: GenericFarkleEndTurnDTO },
  );
