import { t } from 'elysia';
import {
  ItemSchema,
  CreateItemSchema,
  ItemType,
  ItemRarity,
  type Item,
  type PlayerInventory,
  type ItemTypeValue,
  type ItemRarityValue,
} from '@elementary-dices/shared';

// Re-export shared schemas for use in routes
export const ItemResponseDTO = ItemSchema;
export const CreateItemDTO = CreateItemSchema;
export const UpdateItemDTO = t.Partial(CreateItemSchema);

// Player Inventory DTOs
export const PlayerInventoryResponseDTO = t.Object({
  id: t.String({ format: 'uuid' }),
  player_id: t.String({ format: 'uuid' }),
  item_id: t.String({ format: 'uuid' }),
  quantity: t.Integer({ minimum: 0 }),
  item: t.Optional(ItemSchema),
});

export const AddInventoryItemDTO = t.Object({
  item_id: t.String({ format: 'uuid' }),
  quantity: t.Optional(t.Integer({ minimum: 1 })),
});

export const UpdateInventoryItemDTO = t.Object({
  quantity: t.Integer({ minimum: 0 }),
});

// Query filters
export const ItemQueryDTO = t.Object({
  item_type: t.Optional(ItemType),
  rarity: t.Optional(ItemRarity),
});

// Extract TypeScript types
export type { Item, PlayerInventory, ItemTypeValue as ItemType, ItemRarityValue as ItemRarity };
export type CreateItemData = typeof CreateItemDTO.static;
export type UpdateItemData = typeof UpdateItemDTO.static;
export type PlayerInventoryItem = typeof PlayerInventoryResponseDTO.static;
export type AddInventoryItemData = typeof AddInventoryItemDTO.static;
export type UpdateInventoryItemData = typeof UpdateInventoryItemDTO.static;
export type ItemQuery = typeof ItemQueryDTO.static;
