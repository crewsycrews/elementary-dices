import type { CreateEventData, EventOptionsResponse, EventResponse } from "./models/shared";
import { EventService } from "./service";
import type { Locale } from "../../shared/i18n";

export class EventsOrchestratorService {
  constructor(private eventService = new EventService()) {}

  getEventOptions(playerId: string, locale: Locale = "en"): Promise<EventOptionsResponse> {
    return this.eventService.getEventOptions(playerId, locale);
  }

  createEvent(data: CreateEventData, locale: Locale = "en"): Promise<EventResponse> {
    return this.eventService.createEvent(data.player_id, data.event_type, locale);
  }

  getCurrentEvent(playerId: string, locale: Locale = "en"): Promise<EventResponse | null> {
    return this.eventService.getCurrentEvent(playerId, locale);
  }
}
