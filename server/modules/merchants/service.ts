import { EventService } from "../events/service";
import type { Locale } from "../../shared/i18n";

export class MerchantService {
  constructor(private eventService = new EventService()) {}

  leaveMerchant(playerId: string, locale: Locale = "en") {
    return this.eventService.leaveMerchant(playerId, locale);
  }
}
