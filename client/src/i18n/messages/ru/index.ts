import type { Messages } from "../../locales";
import { app } from "./app";
import { events } from "./events";
import { battle } from "./battle";
import { landing } from "./landing";
import { legal } from "./legal";
import { auth } from "./auth";
import { party } from "./party";
import { inventory } from "./inventory";
import { dice } from "./dice";
import { evolutions } from "./evolutions";
import { misc } from "./misc";

export const ru: Messages = {
  ...app,
  ...events,
  ...battle,
  ...landing,
  ...legal,
  ...auth,
  ...party,
  ...inventory,
  ...dice,
  ...evolutions,
  ...misc,
};
