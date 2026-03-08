import { EventService } from "../events/service";
import { SharedFarkleService } from "../events/shared-farkle-service";

export class BattleService {
  constructor(
    private eventService = new EventService(),
    private sharedFarkleService = new SharedFarkleService(eventService),
  ) {}

  startBattle(playerId: string) {
    return this.eventService.startBattle(playerId);
  }

  chooseSetAsideElement(playerId: string, element: string) {
    return this.eventService.chooseSetAsideElement(playerId, element as any);
  }

  farkleInit(playerId: string, eventId: string, setAsideElement: string) {
    return this.sharedFarkleService.init(
      playerId,
      "pvp_battle",
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

  farkleEndTurn(playerId: string, farkleSessionId: string) {
    return this.sharedFarkleService.endTurn(playerId, farkleSessionId);
  }
}
