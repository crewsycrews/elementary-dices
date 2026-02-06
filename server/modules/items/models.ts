import { t } from 'elysia';

// Item types
export type ItemType = 'capture' | 'consumable' | 'buff';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

// Item effect interface
export interface ItemEffect {
  capture_bonus?: number;
  stat_modifier?: {
    health?: number;
    attack?: number;
    defense?: number;
    speed?: number;
  };
  duration?: number;
}

// Item DTOs
export const ItemResponseDTO = t.Object({
  id: t.String(),
  name: t.String(),
  item_type: t.String(),
  effect: t.Any(),
  price: t.Number(),
  rarity: t.String(),
  description: t.String(),
  is_consumable: t.Boolean(),
});

export const CreateItemDTO = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  item_type: t.Union([
    t.Literal('capture'),
    t.Literal('consumable'),
    t.Literal('buff'),
  ]),
  effect: t.Any(),
  price: t.Number({ minimum: 0 }),
  rarity: t.Union([
    t.Literal('common'),
    t.Literal('rare'),
    t.Literal('epic'),
    t.Literal('legendary'),
  ]),
  description: t.String({ minLength: 1 }),
  is_consumable: t.Optional(t.Boolean()),
});

export const UpdateItemDTO = t.Partial(CreateItemDTO);

// Player Inventory DTOs
export const PlayerInventoryResponseDTO = t.Object({
  id: t.String(),
  player_id: t.String(),
  item_id: t.String(),
  quantity: t.Number(),
  item: t.Optional(ItemResponseDTO),
});

export const AddInventoryItemDTO = t.Object({
  item_id: t.String(),
  quantity: t.Optional(t.Number({ minimum: 1 })),
});

export const UpdateInventoryItemDTO = t.Object({
  quantity: t.Number({ minimum: 0 }),
});

// Query filters
export const ItemQueryDTO = t.Object({
  item_type: t.Optional(t.String()),
  rarity: t.Optional(t.String()),
});

// Extract TypeScript types
export type Item = typeof ItemResponseDTO.static;
export type CreateItemData = typeof CreateItemDTO.static;
export type UpdateItemData = typeof UpdateItemDTO.static;
export type PlayerInventory = typeof PlayerInventoryResponseDTO.static;
export type AddInventoryItemData = typeof AddInventoryItemDTO.static;
export type UpdateInventoryItemData = typeof UpdateInventoryItemDTO.static;
export type ItemQuery = typeof ItemQueryDTO.static;
