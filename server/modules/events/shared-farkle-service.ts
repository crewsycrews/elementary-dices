import { EventService } from "./service";

type FarkleContext = "pvp_battle" | "wild_encounter";

export class SharedFarkleService {
  constructor(private eventService = new EventService()) {}

  init(
    playerId: string,
    eventType: FarkleContext,
    eventId: string,
    setAsideElement: string,
  ) {
    return this.eventService.farkleInit(
      playerId,
      eventType,
      eventId,
      setAsideElement as any,
    );
  }

  roll(playerId: string, farkleSessionId: string) {
    return this.eventService.farkleRoll(playerId, farkleSessionId);
  }

  reroll(playerId: string, farkleSessionId: string, diceIndicesToReroll: number[]) {
    return this.eventService.farkleRerollGeneric(
      playerId,
      farkleSessionId,
      diceIndicesToReroll,
    );
  }

  setAside(
    playerId: string,
    farkleSessionId: string,
    diceIndices: number[],
    oneForAllElement?: string,
  ) {
    return this.eventService.farkleSetAsideGeneric(
      playerId,
      farkleSessionId,
      diceIndices,
      oneForAllElement,
    );
  }

  continue(playerId: string, farkleSessionId: string) {
    return this.eventService.farkleContinueGeneric(playerId, farkleSessionId);
  }

  endTurn(playerId: string, farkleSessionId: string, itemId?: string) {
    return this.eventService.farkleEndTurnGeneric(playerId, farkleSessionId, itemId);
  }
}
