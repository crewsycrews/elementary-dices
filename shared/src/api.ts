/**
 * Type-safe API definitions for Eden client usage
 * This module exports the server API type for consumption by the Excalibur client
 */
import { edenTreaty } from "@elysiajs/eden";
import type { App } from "@elementary-dices/server";

/**
 * The API type that will be used by Eden for type-safe client generation
 */
export const api = edenTreaty<App>("http://localhost:3000");
