import { EventService } from "../events/service";
import type { Locale } from "../../shared/i18n";

export class BattleService {
  constructor(
    private eventService = new EventService(),
  ) {}

  startBattle(playerId: string) {
    return this.eventService.startBattle(playerId);
  }

  farkleInit(playerId: string, eventId: string) {
    return this.eventService.farkleV4InitBattle(playerId, eventId);
  }

  farkleRoll(playerId: string, farkleSessionId: string) {
    return this.eventService.farkleV4Roll(playerId, farkleSessionId);
  }

  farkleAssign(
    playerId: string,
    farkleSessionId: string,
    dieIndex: number,
    partyIndex: number,
  ) {
    return this.eventService.farkleV4Assign(playerId, farkleSessionId, dieIndex, partyIndex);
  }

  farkleEndTurn(playerId: string, farkleSessionId: string, locale: Locale = "en") {
    return this.eventService.farkleV4Commit(
      playerId,
      farkleSessionId,
      locale,
    );
  }
}
