import { Elysia, t } from "elysia";
import { ItemService } from "./service";
import {
  CreateItemDTO,
  UpdateItemDTO,
  AddInventoryItemDTO,
  UpdateInventoryItemDTO,
  ItemQueryDTO,
} from "./models";
import { requireAuth } from "../auth/middleware";
import { UnauthorizedError } from "../../shared/errors";
import type { AccessTokenPayload } from "../auth/models";

// Protected admin routes (for creating/updating/deleting items)
const adminItemsRoutes = new Elysia()
  .use(requireAuth)
  .decorate("itemService", new ItemService())
  // Create new item (admin only - basic auth check for now)
  .post(
    "/",
    async (context) => {
      const { body, itemService } = context;
      const item = await itemService.createItem(body);
      return { item };
    },
    {
      body: CreateItemDTO,
    },
  )
  // Update item (admin only)
  .patch(
    "/:id",
    async (context) => {
      const { params, body, itemService } = context;
      const item = await itemService.updateItem(params.id, body);
      return { item };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateItemDTO,
    },
  )
  // Delete item (admin only)
  .delete(
    "/:id",
    async (context) => {
      const { params, itemService } = context;
      await itemService.deleteItem(params.id);
      return { message: "Item deleted successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );

// Protected player inventory routes
const inventoryRoutes = new Elysia()
  .use(requireAuth)
  .decorate("itemService", new ItemService())
  // Get player inventory
  .get(
    "/players/:playerId/inventory",
    async (context) => {
      const { params, itemService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only view your own inventory");
      }
      const inventory = await itemService.findPlayerInventory(params.playerId);
      return { inventory };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
    },
  )
  // Add item to player inventory
  .post(
    "/players/:playerId/inventory",
    async (context) => {
      const { params, body, itemService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError(
          "You can only add items to your own inventory",
        );
      }
      const inventory = await itemService.addInventoryItem(
        params.playerId,
        body,
      );
      return { inventory };
    },
    {
      params: t.Object({
        playerId: t.String(),
      }),
      body: AddInventoryItemDTO,
    },
  )
  // Update inventory item quantity
  .patch(
    "/players/:playerId/inventory/:itemId",
    async (context) => {
      const { params, body, itemService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError("You can only update your own inventory");
      }
      const inventory = await itemService.updateInventoryItem(
        params.playerId,
        params.itemId,
        body,
      );
      return { inventory };
    },
    {
      params: t.Object({
        playerId: t.String(),
        itemId: t.String(),
      }),
      body: UpdateInventoryItemDTO,
    },
  )
  // Use/consume an item
  .post(
    "/players/:playerId/inventory/:itemId/use",
    async (context) => {
      const { params, itemService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError(
          "You can only use items from your own inventory",
        );
      }
      const result = await itemService.useItem(params.playerId, params.itemId);
      return result;
    },
    {
      params: t.Object({
        playerId: t.String(),
        itemId: t.String(),
      }),
    },
  )
  // Delete inventory item
  .delete(
    "/players/:playerId/inventory/:itemId",
    async (context) => {
      const { params, itemService } = context;
      const user = context.user;

      if (user.id !== params.playerId) {
        throw new UnauthorizedError(
          "You can only remove items from your own inventory",
        );
      }
      await itemService.deleteInventoryItem(params.playerId, params.itemId);
      return { message: "Item removed from inventory" };
    },
    {
      params: t.Object({
        playerId: t.String(),
        itemId: t.String(),
      }),
    },
  );

export const itemsModule = new Elysia({ prefix: "/api/items" })
  .decorate("itemService", new ItemService())

  // ===== Public Items Catalog Routes =====
  // Get all items with optional filters
  .get(
    "/",
    async ({ query, itemService }) => {
      const items = await itemService.findAllItems(query);
      return { items };
    },
    {
      query: ItemQueryDTO,
    },
  )
  // Get items by type
  .get(
    "/type/:type",
    async ({ params, itemService }) => {
      const items = await itemService.findItemsByType(params.type);
      return { items };
    },
    {
      params: t.Object({
        type: t.String(),
      }),
    },
  )
  // Get items by rarity
  .get(
    "/rarity/:rarity",
    async ({ params, itemService }) => {
      const items = await itemService.findItemsByRarity(params.rarity);
      return { items };
    },
    {
      params: t.Object({
        rarity: t.String(),
      }),
    },
  )
  // Get item by ID
  .get(
    "/:id",
    async ({ params, itemService }) => {
      const item = await itemService.findItemById(params.id);
      return { item };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // Mount protected routes
  .use(adminItemsRoutes)
  .use(inventoryRoutes);
