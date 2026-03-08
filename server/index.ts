import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { db } from "./db";
import { AppError, isDatabaseError, parsePostgresError } from "./shared/errors";

// Import all modules
import { authModule } from "./modules/auth";
import { elementalsModule } from "./modules/elementals";
import { usersModule } from "./modules/users";
import { diceModule } from "./modules/dice";
import { itemsModule } from "./modules/items";
import { diceRollsModule } from "./modules/dice-rolls";
import { eventsModule } from "./modules/events";
import { battlesModule } from "./modules/battles";
import { wildEncountersModule } from "./modules/wild-encounters";
import { merchantsModule } from "./modules/merchants";
import { evolutionModule } from "./modules/evolution";
import { playerElementalsModule } from "./modules/player-elementals";

export const app = new Elysia()
  .use(
    cors({
      credentials: true, // Allow cookies to be sent
    }),
  )
  // Global error handler
  .onError(({ code, error, set }) => {
    // Cast error to any for database error checking
    const err = error as any;

    // Check if it's a database error first
    if (isDatabaseError(err)) {
      const dbError = parsePostgresError(err);

      console.error("❌ DATABASE ERROR:");
      console.error(`  Message: ${dbError.message}`);
      console.error(`  Code: ${err.code}`);
      if (err.table) console.error(`  Table: ${err.table}`);
      if (err.column) console.error(`  Column: ${err.column}`);
      if (err.constraint) console.error(`  Constraint: ${err.constraint}`);
      console.error(`  Original: ${err.message}`);

      set.status = 500;
      return {
        error: dbError.message,
        code: dbError.code,
        details:
          process.env.NODE_ENV === "development"
            ? {
                pgCode: err.code,
                table: err.table,
                column: err.column,
                constraint: err.constraint,
                originalMessage: err.message,
              }
            : undefined,
      };
    }

    // Handle custom AppError
    if (error instanceof AppError) {
      console.error(`❌ ${error.name}:`, error.message);
      set.status = error.statusCode;
      return {
        error: error.message,
        code: error.code,
      };
    }

    // Handle Elysia validation errors
    if (code === "VALIDATION") {
      console.error("❌ VALIDATION ERROR:", error.message);
      set.status = 400;
      return {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.message,
      };
    }

    // Handle not found
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        error: "Route not found",
        code: "NOT_FOUND",
      };
    }

    // Default error
    console.error("❌ INTERNAL ERROR:", error);
    set.status = 500;
    return {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : String(error),
    };
  })
  // Root endpoint
  .get("/api", () => ({
    name: "🎮 Elementary Dices API",
    version: "1.0.0",
    description: "A dice rolling collectible game with elementals",
  }))
  // Health check endpoint
  .get("/api/health", async () => {
    try {
      await db.raw("SELECT 1");
      return {
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        database: "disconnected",
        error: String(error),
      };
    }
  })
  // Register all feature modules
  .use(authModule) // Auth module first (provides login/OAuth)
  .use(elementalsModule)
  .use(usersModule)
  .use(playerElementalsModule)
  .use(diceModule)
  .use(itemsModule)
  .use(diceRollsModule)
  .use(eventsModule)
  .use(battlesModule)
  .use(wildEncountersModule)
  .use(merchantsModule)
  .use(evolutionModule)
  .listen(3000);

export type App = typeof app;

// Test database connection on startup
db.raw("SELECT 1")
  .then(() => console.log("✅ Database connected"))
  .catch((err) => console.error("❌ Database connection failed:", err.message));

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log("\n📦 Registered modules:");
console.log("  - Auth (Password + Google OAuth)");
console.log("  - Elementals (CRUD)");
console.log("  - Users (CRUD + profiles)");
console.log("  - Player Elementals (Collection management + Onboarding)");
console.log("  - Dice (Types + Player inventory)");
console.log("  - Items (CRUD + Player inventory)");
console.log("  - Dice Rolls (Core game mechanics)");
console.log("  - Events (Wild encounters, PvP, Merchant)");
console.log("  - Evolution (Combining elementals)");
console.log("\n🎮 Ready to play!\n");

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await db.destroy();
  console.log("✅ Database connections closed");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await db.destroy();
  console.log("✅ Database connections closed");
  process.exit(0);
});
