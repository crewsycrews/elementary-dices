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

export class ItemRepository {
  private itemsTable = 'items';
  private inventoryTable = 'player_inventory';

  // Items
  async findAllItems(query?: ItemQuery): Promise<Item[]> {
    let queryBuilder = db(this.itemsTable).select('*');

    if (query?.item_type) {
      queryBuilder = queryBuilder.where('item_type', query.item_type);
    }

    if (query?.rarity) {
      queryBuilder = queryBuilder.where('rarity', query.rarity);
    }

    return queryBuilder.orderBy('rarity', 'asc').orderBy('name', 'asc');
  }

  async findItemById(id: string): Promise<Item | null> {
    const [item] = await db(this.itemsTable).where({ id }).limit(1);
    return item || null;
  }

  async findItemsByType(itemType: string): Promise<Item[]> {
    return db(this.itemsTable)
      .where({ item_type: itemType })
      .orderBy('name', 'asc');
  }

  async findItemsByRarity(rarity: string): Promise<Item[]> {
    return db(this.itemsTable)
      .where({ rarity })
      .orderBy('name', 'asc');
  }

  async createItem(data: CreateItemData): Promise<Item> {
    const [item] = await db(this.itemsTable)
      .insert({
        ...data,
        effect: JSON.stringify(data.effect),
      })
      .returning('*');
    return item;
  }

  async updateItem(id: string, data: UpdateItemData): Promise<Item | null> {
    const updateData: any = { ...data };

    if (data.effect) {
      updateData.effect = JSON.stringify(data.effect);
    }

    const [item] = await db(this.itemsTable)
      .where({ id })
      .update(updateData)
      .returning('*');

    return item || null;
  }

  async deleteItem(id: string): Promise<boolean> {
    const deleted = await db(this.itemsTable).where({ id }).delete();
    return deleted > 0;
  }

  // Player Inventory
  async findPlayerInventory(playerId: string): Promise<PlayerInventory[]> {
    return db(this.inventoryTable)
      .where({ player_id: playerId })
      .leftJoin(
        this.itemsTable,
        `${this.inventoryTable}.item_id`,
        `${this.itemsTable}.id`
      )
      .select(
        `${this.inventoryTable}.*`,
        db.raw(`
          json_build_object(
            'id', ${this.itemsTable}.id,
            'name', ${this.itemsTable}.name,
            'item_type', ${this.itemsTable}.item_type,
            'effect', ${this.itemsTable}.effect,
            'price', ${this.itemsTable}.price,
            'rarity', ${this.itemsTable}.rarity,
            'description', ${this.itemsTable}.description,
            'is_consumable', ${this.itemsTable}.is_consumable
          ) as item
        `)
      )
      .orderBy(`${this.itemsTable}.name`, 'asc');
  }

  async findInventoryItem(playerId: string, itemId: string): Promise<PlayerInventory | null> {
    const [inventory] = await db(this.inventoryTable)
      .where({ player_id: playerId, item_id: itemId })
      .leftJoin(
        this.itemsTable,
        `${this.inventoryTable}.item_id`,
        `${this.itemsTable}.id`
      )
      .select(
        `${this.inventoryTable}.*`,
        db.raw(`
          json_build_object(
            'id', ${this.itemsTable}.id,
            'name', ${this.itemsTable}.name,
            'item_type', ${this.itemsTable}.item_type,
            'effect', ${this.itemsTable}.effect,
            'price', ${this.itemsTable}.price,
            'rarity', ${this.itemsTable}.rarity,
            'description', ${this.itemsTable}.description,
            'is_consumable', ${this.itemsTable}.is_consumable
          ) as item
        `)
      )
      .limit(1);

    return inventory || null;
  }

  async addInventoryItem(playerId: string, data: AddInventoryItemData): Promise<PlayerInventory> {
    // Try to find existing inventory item
    const existing = await this.findInventoryItem(playerId, data.item_id);

    if (existing) {
      // Update quantity
      const [updated] = await db(this.inventoryTable)
        .where({ player_id: playerId, item_id: data.item_id })
        .increment('quantity', data.quantity || 1)
        .returning('*');

      return this.findInventoryItem(playerId, data.item_id) as Promise<PlayerInventory>;
    } else {
      // Create new inventory item
      const [inventory] = await db(this.inventoryTable)
        .insert({
          player_id: playerId,
          item_id: data.item_id,
          quantity: data.quantity || 1,
        })
        .returning('*');

      return this.findInventoryItem(playerId, data.item_id) as Promise<PlayerInventory>;
    }
  }

  async updateInventoryItem(
    playerId: string,
    itemId: string,
    data: UpdateInventoryItemData
  ): Promise<PlayerInventory | null> {
    const [inventory] = await db(this.inventoryTable)
      .where({ player_id: playerId, item_id: itemId })
      .update(data)
      .returning('*');

    if (!inventory) return null;

    return this.findInventoryItem(playerId, itemId);
  }

  async decrementInventoryItem(playerId: string, itemId: string, amount: number = 1): Promise<PlayerInventory | null> {
    const existing = await this.findInventoryItem(playerId, itemId);

    if (!existing || existing.quantity < amount) {
      return null;
    }

    const newQuantity = existing.quantity - amount;

    if (newQuantity === 0) {
      // Delete if quantity reaches 0
      await db(this.inventoryTable)
        .where({ player_id: playerId, item_id: itemId })
        .delete();
      return null;
    }

    return this.updateInventoryItem(playerId, itemId, { quantity: newQuantity });
  }

  async deleteInventoryItem(playerId: string, itemId: string): Promise<boolean> {
    const deleted = await db(this.inventoryTable)
      .where({ player_id: playerId, item_id: itemId })
      .delete();
    return deleted > 0;
  }
}
