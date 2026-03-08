import { EventService } from "../events/service";

export class MerchantService {
  constructor(private eventService = new EventService()) {}

  leaveMerchant(playerId: string) {
    return this.eventService.leaveMerchant(playerId);
  }
}
