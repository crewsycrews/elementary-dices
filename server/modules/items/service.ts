import { ItemRepository } from './repository';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { db } from '../../db';
import type {
  CreateItemData,
  UpdateItemData,
  Item,
  PlayerInventory,
  AddInventoryItemData,
  UpdateInventoryItemData,
  ItemQuery,
} from './models';

export class ItemService {
  constructor(private repository = new ItemRepository()) {}

  // Items
  async findAllItems(query?: ItemQuery): Promise<Item[]> {
    return this.repository.findAllItems(query);
  }

  async findItemById(id: string): Promise<Item> {
    const item = await this.repository.findItemById(id);
    if (!item) {
      throw new NotFoundError('Item');
    }
    return item;
  }

  async findItemsByType(itemType: string): Promise<Item[]> {
    return this.repository.findItemsByType(itemType);
  }

  async findItemsByRarity(rarity: string): Promise<Item[]> {
    return this.repository.findItemsByRarity(rarity);
  }

  async createItem(data: CreateItemData): Promise<Item> {
    return this.repository.createItem(data);
  }

  async updateItem(id: string, data: UpdateItemData): Promise<Item> {
    const item = await this.repository.updateItem(id, data);
    if (!item) {
      throw new NotFoundError('Item');
    }
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    const deleted = await this.repository.deleteItem(id);
    if (!deleted) {
      throw new NotFoundError('Item');
    }
  }

  // Player Inventory
  async findPlayerInventory(playerId: string): Promise<PlayerInventory[]> {
    return this.repository.findPlayerInventory(playerId);
  }

  async findInventoryItem(playerId: string, itemId: string): Promise<PlayerInventory> {
    const inventory = await this.repository.findInventoryItem(playerId, itemId);
    if (!inventory) {
      throw new NotFoundError('Inventory item');
    }
    return inventory;
  }

  async addInventoryItem(playerId: string, data: AddInventoryItemData): Promise<PlayerInventory> {
    // Verify item exists and charge currency for purchase.
    const item = await this.findItemById(data.item_id);
    const quantity = data.quantity || 1;
    const totalCost = item.price * quantity;

    await db.transaction(async (trx) => {
      const user = await trx('users')
        .where({ id: playerId })
        .select('currency')
        .first();

      if (!user) {
        throw new NotFoundError('User');
      }

      if (user.currency < totalCost) {
        throw new BadRequestError('Insufficient currency');
      }

      await trx('users')
        .where({ id: playerId })
        .decrement('currency', totalCost);

      const existing = await trx('player_inventory')
        .where({ player_id: playerId, item_id: data.item_id })
        .first();

      if (existing) {
        await trx('player_inventory')
          .where({ player_id: playerId, item_id: data.item_id })
          .increment('quantity', quantity);
      } else {
        await trx('player_inventory').insert({
          player_id: playerId,
          item_id: data.item_id,
          quantity,
        });
      }
    });

    return this.findInventoryItem(playerId, data.item_id);
  }

  async updateInventoryItem(
    playerId: string,
    itemId: string,
    data: UpdateInventoryItemData
  ): Promise<PlayerInventory> {
    const inventory = await this.repository.updateInventoryItem(playerId, itemId, data);
    if (!inventory) {
      throw new NotFoundError('Inventory item');
    }
    return inventory;
  }

  async useItem(playerId: string, itemId: string): Promise<{ item: Item; remaining: number | null }> {
    // Find the item details
    const item = await this.findItemById(itemId);

    if (!item.is_consumable) {
      throw new BadRequestError('This item is not consumable');
    }

    // Decrement the inventory
    const updated = await this.repository.decrementInventoryItem(playerId, itemId, 1);

    return {
      item,
      remaining: updated?.quantity ?? null,
    };
  }

  async deleteInventoryItem(playerId: string, itemId: string): Promise<void> {
    const deleted = await this.repository.deleteInventoryItem(playerId, itemId);
    if (!deleted) {
      throw new NotFoundError('Inventory item');
    }
  }
}
