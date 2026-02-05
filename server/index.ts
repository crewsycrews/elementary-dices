import { Elysia, t } from "elysia";
import { cors } from '@elysiajs/cors';
import { db } from './db';

export const app = new Elysia()
  .use(cors())
  .get("/api", () => "🎮 Elementary Dices API")
  .get("/api/health", async () => {
    try {
      await db.raw('SELECT 1');
      return { status: "ok", database: "connected" };
    } catch (error) {
      return { status: "error", database: "disconnected", error: String(error) };
    }
  })
  .get("/api/elementals", async () => {
    try {
      const elementals = await db('elementals')
        .select('*')
        .orderBy('level', 'asc');
      return { elementals };
    } catch (error) {
      return { error: String(error) };
    }
  })
  .post(
    "/api/roll",
    ({ body }) => {
      return { received: body, timestamp: Date.now() };
    },
    { body: t.Object({ dice: t.Number(), sides: t.Number() }) },
  )
  .listen(3000);

export type App = typeof app;

// Test database connection on startup
db.raw('SELECT 1')
  .then(() => console.log('✅ Database connected'))
  .catch((err) => console.error('❌ Database connection failed:', err.message));

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await db.destroy();
  console.log('✅ Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await db.destroy();
  console.log('✅ Database connections closed');
  process.exit(0);
});
