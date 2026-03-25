import { EventService } from "../events/service";
import { SharedFarkleService } from "../events/shared-farkle-service";
import type { ResolveWildEncounterData } from "../events/models/wild-encounter";
import type { Locale } from "../../shared/i18n";

export class WildEncounterService {
  constructor(
    private eventService = new EventService(),
    private sharedFarkleService = new SharedFarkleService(eventService),
  ) {}

  resolveWildEncounter(data: ResolveWildEncounterData, locale: Locale = "en") {
    return this.eventService.resolveWildEncounter(data, locale);
  }

  skipWildEncounter(playerId: string, locale: Locale = "en") {
    return this.eventService.skipWildEncounter(playerId, locale);
  }

  farkleInit(playerId: string, eventId: string, setAsideElement: string) {
    return this.sharedFarkleService.init(
      playerId,
      "wild_encounter",
      eventId,
      setAsideElement,
    );
  }

  farkleRoll(playerId: string, farkleSessionId: string) {
    return this.sharedFarkleService.roll(playerId, farkleSessionId);
  }

  farkleReroll(playerId: string, farkleSessionId: string, diceIndicesToReroll: number[]) {
    return this.sharedFarkleService.reroll(
      playerId,
      farkleSessionId,
      diceIndicesToReroll,
    );
  }

  farkleSetAside(
    playerId: string,
    farkleSessionId: string,
    diceIndices: number[],
    oneForAllElement?: string,
  ) {
    return this.sharedFarkleService.setAside(
      playerId,
      farkleSessionId,
      diceIndices,
      oneForAllElement,
    );
  }

  farkleContinue(playerId: string, farkleSessionId: string) {
    return this.sharedFarkleService.continue(playerId, farkleSessionId);
  }

  farkleEndTurn(
    playerId: string,
    farkleSessionId: string,
    locale: Locale = "en",
    itemId?: string,
  ) {
    return this.sharedFarkleService.endTurnWithLocale(
      playerId,
      farkleSessionId,
      locale,
      itemId,
    );
  }
}
