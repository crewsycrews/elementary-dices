import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { AppError } from './shared/errors';

// Import all modules
import { elementalsModule } from './modules/elementals';
import { usersModule } from './modules/users';
import { diceModule } from './modules/dice';
import { itemsModule } from './modules/items';
import { diceRollsModule } from './modules/dice-rolls';
import { eventsModule } from './modules/events';
import { evolutionModule } from './modules/evolution';

export const app = new Elysia()
  .use(cors())
  // Global error handler
  .onError(({ code, error, set }) => {
    console.error('Error:', error);

    // Handle custom AppError
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.message,
        code: error.code,
      };
    }

    // Handle Elysia validation errors
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.message,
      };
    }

    // Handle not found
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        error: 'Route not found',
        code: 'NOT_FOUND',
      };
    }

    // Default error
    set.status = 500;
    return {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  })
  // Root endpoint
  .get('/api', () => ({
    name: '🎮 Elementary Dices API',
    version: '1.0.0',
    description: 'A dice rolling collectible game with elementals',
  }))
  // Health check endpoint
  .get('/api/health', async () => {
    try {
      await db.raw('SELECT 1');
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: String(error),
      };
    }
  })
  // Register all feature modules
  .use(elementalsModule)
  .use(usersModule)
  .use(diceModule)
  .use(itemsModule)
  .use(diceRollsModule)
  .use(eventsModule)
  .use(evolutionModule)
  .listen(3000);

export type App = typeof app;

// Test database connection on startup
db.raw('SELECT 1')
  .then(() => console.log('✅ Database connected'))
  .catch((err) => console.error('❌ Database connection failed:', err.message));

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
console.log('\n📦 Registered modules:');
console.log('  - Elementals (CRUD)');
console.log('  - Users (CRUD + profiles)');
console.log('  - Dice (Types + Player inventory)');
console.log('  - Items (CRUD + Player inventory)');
console.log('  - Dice Rolls (Core game mechanics)');
console.log('  - Events (Wild encounters, PvP, Merchant)');
console.log('  - Evolution (Combining elementals)');
console.log('\n🎮 Ready to play!\n');

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
