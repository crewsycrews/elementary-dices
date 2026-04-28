import { EventService } from "../events/service";
import type { ResolveWildEncounterData } from "../events/models/wild-encounter";
import type { Locale } from "../../shared/i18n";

export class WildEncounterService {
  constructor(
    private eventService = new EventService(),
  ) {}

  resolveWildEncounter(data: ResolveWildEncounterData, locale: Locale = "en") {
    return this.eventService.resolveWildEncounter(data, locale);
  }

  skipWildEncounter(playerId: string, locale: Locale = "en") {
    return this.eventService.skipWildEncounter(playerId, locale);
  }

  farkleInit(playerId: string, eventId: string) {
    return this.eventService.farkleV4InitWildEncounter(playerId, eventId);
  }

  farkleRoll(playerId: string, farkleSessionId: string) {
    return this.eventService.farkleV4RollWildEncounter(playerId, farkleSessionId);
  }

  farkleAssign(
    playerId: string,
    farkleSessionId: string,
    dieIndex: number,
    partyIndex: number,
  ) {
    return this.eventService.farkleV4AssignWildEncounter(
      playerId,
      farkleSessionId,
      dieIndex,
      partyIndex,
    );
  }

  farkleEndTurn(
    playerId: string,
    farkleSessionId: string,
    locale: Locale = "en",
    itemId?: string,
  ) {
    return this.eventService.farkleV4CommitWildEncounter(
      playerId,
      farkleSessionId,
      itemId,
      locale,
    );
  }
}
