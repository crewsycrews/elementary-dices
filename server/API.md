# Elementary Dices - API Documentation

## Overview

Elementary Dices is a dice-rolling collectible game with elementals. This API provides comprehensive backend functionality for managing elementals, dice, items, events, and gameplay mechanics.

**Base URL:** `http://localhost:3000/api`

---

## 📦 Modules

### 1. **Elementals Module** (`/api/elementals`)

Manage elemental creatures (base CRUD operations).

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/elementals` | Get all elementals with optional filters |
| GET | `/api/elementals/stats` | Get elemental statistics |
| GET | `/api/elementals/base` | Get base elementals only |
| GET | `/api/elementals/level/:level` | Get elementals by level |
| GET | `/api/elementals/element/:type` | Get elementals by element type |
| GET | `/api/elementals/:id` | Get elemental by ID |
| POST | `/api/elementals` | Create new elemental |
| PATCH | `/api/elementals/:id` | Update elemental |
| DELETE | `/api/elementals/:id` | Delete elemental |

**Query Parameters (GET `/api/elementals`):**
- `level` - Filter by level (1-4)
- `element_type` - Filter by element type
- `is_base_elemental` - Filter base elementals (true/false)

---

### 2. **Users Module** (`/api/users`)

Manage players and user profiles.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get user profile with stats |
| GET | `/api/users/username/:username` | Get user by username |
| POST | `/api/users` | Create new user |
| PATCH | `/api/users/:id` | Update user |
| PATCH | `/api/users/:id/currency` | Update user currency |
| DELETE | `/api/users/:id` | Delete user |

**User Profile Response includes:**
- User details (id, username, email, currency)
- Stats (total_elementals, active_elementals, backpack_elementals, total_dice, total_items)

**Currency Update Operations:**
- `add` - Add currency
- `subtract` - Subtract currency (checks for insufficient funds)
- `set` - Set currency to specific amount

---

### 3. **Dice Module** (`/api/dice`)

Manage dice types and player dice inventory.

#### Dice Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dice/types` | Get all dice types |
| GET | `/api/dice/types/rarity/:rarity` | Get dice types by rarity |
| GET | `/api/dice/types/:id` | Get dice type by ID |
| POST | `/api/dice/types` | Create new dice type |
| PATCH | `/api/dice/types/:id` | Update dice type |
| DELETE | `/api/dice/types/:id` | Delete dice type |

**Dice Types:**
- d4, d6, d10, d12, d20

**Dice Rarities:**
- green, blue, purple, gold

#### Player Dice Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dice/players/:playerId` | Get all player dice |
| GET | `/api/dice/players/:playerId/equipped` | Get equipped dice |
| POST | `/api/dice/players/:playerId` | Add dice to inventory |
| PATCH | `/api/dice/players/:playerId/:diceId/equip` | Equip a dice |
| PATCH | `/api/dice/players/:playerId/:diceId/unequip` | Unequip a dice |
| DELETE | `/api/dice/players/:playerId/:diceId` | Remove dice from inventory |

---

### 4. **Items Module** (`/api/items`)

Manage items and player inventory.

#### Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | Get all items |
| GET | `/api/items/type/:type` | Get items by type |
| GET | `/api/items/rarity/:rarity` | Get items by rarity |
| GET | `/api/items/:id` | Get item by ID |
| POST | `/api/items` | Create new item |
| PATCH | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |

**Item Types:**
- `capture` - Items for catching elementals
- `consumable` - General consumable items
- `buff` - Buff items

**Item Rarities:**
- common, rare, epic, legendary

#### Player Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items/players/:playerId/inventory` | Get player inventory |
| POST | `/api/items/players/:playerId/inventory` | Add item to inventory |
| PATCH | `/api/items/players/:playerId/inventory/:itemId` | Update inventory quantity |
| POST | `/api/items/players/:playerId/inventory/:itemId/use` | Use/consume an item |
| DELETE | `/api/items/players/:playerId/inventory/:itemId` | Remove item from inventory |

---

### 5. **Dice Rolls Module** (`/api/rolls`)

Core game mechanics - dice rolling and outcome determination.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rolls` | Perform a dice roll |
| GET | `/api/rolls/:id` | Get roll by ID |
| GET | `/api/rolls/players/:playerId` | Get player's roll history |
| GET | `/api/rolls/players/:playerId/stats` | Get player roll statistics |
| GET | `/api/rolls/battles/:battleId` | Get rolls by battle |

**Perform Roll Request:**
```json
{
  "player_id": "uuid",
  "dice_type_id": "uuid (optional - uses equipped if not provided)",
  "context": "capture_attempt | combat | penalty_roll | event_trigger | initial_roll",
  "battle_id": "uuid (optional)",
  "element_affinity": "fire|water|earth|air|lightning (optional)",
  "item_bonus": 5 (optional)
}
```

**Roll Response includes:**
- Roll record (id, outcome, roll_value, modifiers)
- Details (dice info, raw roll, modifiers breakdown, final value, threshold used)

**Outcomes:**
- `crit_success` - Critical success
- `success` - Success
- `fail` - Failure
- `crit_fail` - Critical failure

**Contexts:**
- `capture_attempt` - Attempting to capture wild elemental
- `combat` - Combat roll
- `penalty_roll` - Penalty roll (on failure)
- `event_trigger` - Triggering next event
- `initial_roll` - Initial game roll (1d5)

---

### 6. **Events Module** (`/api/events`)

Event generation based on game probabilities.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/events/trigger` | Trigger a random event |
| GET | `/api/events/probabilities` | Get event probabilities |

**Event Probabilities:**
- Wild Encounter: 50%
- PvP Battle: 30%
- Merchant: 20%

**Event Types:**

1. **Wild Encounter:**
```json
{
  "event_type": "wild_encounter",
  "description": "A wild [name] appeared!",
  "data": {
    "elemental_id": "uuid",
    "elemental_name": "string",
    "elemental_level": 1,
    "capture_difficulty": "easy|medium|hard"
  }
}
```

2. **PvP Battle:**
```json
{
  "event_type": "pvp_battle",
  "description": "Challenge from opponent",
  "data": {
    "opponent_name": "Brave Warrior",
    "opponent_power_level": 150,
    "potential_reward": 1500
  }
}
```

3. **Merchant:**
```json
{
  "event_type": "merchant",
  "description": "Traveling merchant appeared",
  "data": {
    "available_items": [...],
    "available_dice": [...]
  }
}
```

---

### 7. **Evolution Module** (`/api/evolution`)

Combine elementals to create evolved forms.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/evolution` | Get all evolution recipes |
| GET | `/api/evolution/:id` | Get evolution recipe by ID |
| GET | `/api/evolution/players/:playerId/discovered` | Get player's discovered recipes |
| POST | `/api/evolution/combine` | Combine elementals |

**Combine Request:**
```json
{
  "player_id": "uuid",
  "player_elemental_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Combine Response:**
```json
{
  "success": true,
  "message": "Successfully evolved into [name]!",
  "new_elemental": {
    "id": "uuid",
    "elemental_id": "uuid",
    "elemental_name": "string",
    "level": 2
  },
  "consumed_elementals": ["uuid1", "uuid2", "uuid3"],
  "recipe_discovered": true
}
```

**Evolution Rules:**
- Same element (3 required) → Next level same element
- Different elements (2 required) → Hybrid elemental
- Specific combinations → Higher level unique elementals

---

## 🎮 Game Flow

### 1. **Starting the Game**

1. Create user: `POST /api/users`
2. Initial roll (1d5): `POST /api/rolls` with context `initial_roll`
3. Get starting elemental based on roll result
4. Add dice to player: `POST /api/dice/players/:playerId`

### 2. **Main Game Loop**

1. Trigger event: `POST /api/events/trigger`
2. Based on event type:
   - **Wild Encounter:** Roll dice to capture
   - **PvP Battle:** Combat simulation
   - **Merchant:** Browse and purchase items/dice
3. Manage elementals:
   - View collection: `GET /api/users/:id`
   - Combine for evolution: `POST /api/evolution/combine`

### 3. **Dice Rolling Mechanics**

- Each dice has outcome thresholds
- Bonuses apply from element affinity and items
- Outcome determines event result:
  - Crit Success: Best outcome
  - Success: Positive outcome
  - Fail: Neutral/negative outcome
  - Crit Fail: Worst outcome (may trigger penalty)

### 4. **Penalty System**

On critical failure:
- Penalty roll triggered
- If fail again: Elemental downgrades one level
- Cannot go below base elemental level

---

## 🏗️ Architecture

This API follows **ElysiaJS Best Practices**:

- **Feature-based modules** - Organized by domain (elementals, dice, items, etc.)
- **Layer separation:**
  - **Controller** (`index.ts`) - Routes and HTTP handling
  - **Service** (`service.ts`) - Business logic
  - **Repository** (`repository.ts`) - Database access
  - **Models** (`models.ts`) - DTOs and type definitions

- **Type safety** - Full TypeScript with Elysia type inference
- **Error handling** - Custom error classes with proper HTTP status codes
- **Validation** - Elysia's built-in validation using `t` schemas

---

## 🔧 Error Handling

All errors return consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details (validation only)"
}
```

**Error Codes:**
- `NOT_FOUND` - Resource not found (404)
- `VALIDATION_ERROR` - Validation failed (400)
- `BAD_REQUEST` - Invalid request (400)
- `CONFLICT` - Resource conflict (409)
- `UNAUTHORIZED` - Unauthorized (401)
- `FORBIDDEN` - Forbidden (403)
- `INTERNAL_ERROR` - Server error (500)

---

## 🚀 Quick Start

1. Run migrations: `bun run db:migrate`
2. Seed database: `bun run db:seed`
3. Start server: `bun run dev`
4. Test health: `GET http://localhost:3000/api/health`

---

## 📝 Notes

- All IDs are UUIDs (v7 for time-ordering)
- Timestamps are auto-managed
- JSONB fields used for flexible data (stats, effects, thresholds)
- Cascading deletes protect data integrity
- Unique constraints prevent duplicates

Enjoy playing Elementary Dices! 🎲✨
