import type { CreateEventData, EventOptionsResponse, EventResponse } from "./models/shared";
import { EventService } from "./service";

export class EventsOrchestratorService {
  constructor(private eventService = new EventService()) {}

  getEventOptions(playerId: string): Promise<EventOptionsResponse> {
    return this.eventService.getEventOptions(playerId);
  }

  createEvent(data: CreateEventData): Promise<EventResponse> {
    return this.eventService.createEvent(data.player_id, data.event_type);
  }

  getCurrentEvent(playerId: string): Promise<EventResponse | null> {
    return this.eventService.getCurrentEvent(playerId);
  }
}
