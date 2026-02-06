import { Elysia, t } from 'elysia';
import { ItemService } from './service';
import {
  CreateItemDTO,
  UpdateItemDTO,
  AddInventoryItemDTO,
  UpdateInventoryItemDTO,
  ItemQueryDTO,
} from './models';

export const itemsModule = new Elysia({ prefix: '/api/items' })
  .decorate('itemService', new ItemService())
  // ===== Items Routes =====
  // Get all items with optional filters
  .get(
    '/',
    async ({ query, itemService }) => {
      const items = await itemService.findAllItems(query);
      return { items };
    },
    {
      query: ItemQueryDTO,
    }
  )
  // Get items by type
  .get(
    '/type/:type',
    async ({ params, itemService }) => {
      const items = await itemService.findItemsByType(params.type);
      return { items };
    },
    {
      params: t.Object({
        type: t.String(),
      }),
    }
  )
  // Get items by rarity
  .get(
    '/rarity/:rarity',
    async ({ params, itemService }) => {
      const items = await itemService.findItemsByRarity(params.rarity);
      return { items };
    },
    {
      params: t.Object({
        rarity: t.String(),
      }),
    }
  )
  // Get item by ID
  .get(
    '/:id',
    async ({ params, itemService }) => {
      const item = await itemService.findItemById(params.id);
      return { item };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // Create new item
  .post(
    '/',
    async ({ body, itemService }) => {
      const item = await itemService.createItem(body);
      return { item };
    },
    {
      body: CreateItemDTO,
    }
  )
  // Update item
  .patch(
    '/:id',
    async ({ params, body, itemService }) => {
      const item = await itemService.updateItem(params.id, body);
      return { item };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateItemDTO,
    }
  )
  // Delete item
  .delete(
    '/:id',
    async ({ params, itemService }) => {
      await itemService.deleteItem(params.id);
      return { message: 'Item deleted successfully' };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // ===== Player Inventory Routes =====
  // Get player inventory
  .get(
    '/players/:playerId/inventory',
    async ({ params, itemService }) => {
      const inventory = await itemService.findPlayerInventory(params.playerId);
      return { inventory };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    }
  )
  // Add item to player inventory
  .post(
    '/players/:playerId/inventory',
    async ({ params, body, itemService }) => {
      const inventory = await itemService.addInventoryItem(params.playerId, body);
      return { inventory };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
      body: AddInventoryItemDTO,
    }
  )
  // Update inventory item quantity
  .patch(
    '/players/:playerId/inventory/:itemId',
    async ({ params, body, itemService }) => {
      const inventory = await itemService.updateInventoryItem(
        params.playerId,
        params.itemId,
        body
      );
      return { inventory };
    },
    {
      params: t.Object({
        playerId: t.String(),
        itemId: t.String(),
      }),
      body: UpdateInventoryItemDTO,
    }
  )
  // Use/consume an item
  .post(
    '/players/:playerId/inventory/:itemId/use',
    async ({ params, itemService }) => {
      const result = await itemService.useItem(params.playerId, params.itemId);
      return result;
    },
    {
      params: t.Object({
        playerId: t.String(),
        itemId: t.String(),
      }),
    }
  )
  // Delete inventory item
  .delete(
    '/players/:playerId/inventory/:itemId',
    async ({ params, itemService }) => {
      await itemService.deleteInventoryItem(params.playerId, params.itemId);
      return { message: 'Item removed from inventory' };
    },
    {
      params: t.Object({
        playerId: t.String(),
        itemId: t.String(),
      }),
    }
  );
