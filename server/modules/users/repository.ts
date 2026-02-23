import { db } from '../../db';
import type { CreateUserData, UpdateUserData, User } from './models';

export class UserRepository {
  private table = 'users';

  async findAll(): Promise<User[]> {
    return db(this.table)
      .select('id', 'username', 'email', 'currency', 'updated_at')
      .orderBy('username', 'asc');
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await db(this.table)
      .select('id', 'username', 'email', 'currency', 'updated_at')
      .where({ id })
      .limit(1);
    return user || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [user] = await db(this.table)
      .select('id', 'username', 'email', 'currency', 'updated_at')
      .where({ username })
      .limit(1);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db(this.table)
      .select('id', 'username', 'email', 'currency', 'updated_at')
      .where({ email })
      .limit(1);
    return user || null;
  }

  async findByUsernameWithPassword(
    username: string
  ): Promise<(User & { password_hash: string }) | null> {
    const [user] = await db(this.table)
      .select('id', 'username', 'email', 'currency', 'updated_at', 'password_hash')
      .where({ username })
      .limit(1);
    return user || null;
  }

  async create(data: CreateUserData & { password_hash: string }): Promise<User> {
    const [user] = await db(this.table)
      .insert({
        username: data.username,
        email: data.email,
        password_hash: data.password_hash,
      })
      .returning(['id', 'username', 'email', 'currency', 'updated_at']);
    return user;
  }

  async update(id: string, data: Partial<UpdateUserData & { password_hash?: string }>): Promise<User | null> {
    const [user] = await db(this.table)
      .where({ id })
      .update(data)
      .returning(['id', 'username', 'email', 'currency', 'updated_at']);
    return user || null;
  }

  async updateCurrency(id: string, amount: number): Promise<User | null> {
    const [user] = await db(this.table)
      .where({ id })
      .update({ currency: amount })
      .returning(['id', 'username', 'email', 'currency', 'updated_at']);
    return user || null;
  }

  async incrementCurrency(id: string, amount: number): Promise<User | null> {
    const [user] = await db(this.table)
      .where({ id })
      .increment('currency', amount)
      .returning(['id', 'username', 'email', 'currency', 'updated_at']);
    return user || null;
  }

  async decrementCurrency(id: string, amount: number): Promise<User | null> {
    const [user] = await db(this.table)
      .where({ id })
      .decrement('currency', amount)
      .returning(['id', 'username', 'email', 'currency', 'updated_at']);
    return user || null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db(this.table).where({ id }).delete();
    return deleted > 0;
  }

  async count(): Promise<number> {
    const [{ count }] = await db(this.table).count('* as count');
    return Number(count);
  }

  // Get user stats
  async getUserStats(userId: string): Promise<{
    total_elementals: number;
    active_elementals: number;
    backpack_elementals: number;
    total_dice: number;
    total_items: number;
  }> {
    const [elementalStats] = await db('player_elementals')
      .where({ player_id: userId })
      .select<{ total_elementals: string; active_elementals: string; backpack_elementals: string }[]>(
        db.raw('COUNT(*) as total_elementals'),
        db.raw('COUNT(*) FILTER (WHERE is_in_active_party = true) as active_elementals'),
        db.raw('COUNT(*) FILTER (WHERE is_in_active_party = false) as backpack_elementals')
      );

    const [diceStats] = await db('player_dice')
      .where({ player_id: userId })
      .count<{ total_dice: string }[]>('* as total_dice');

    const [itemStats] = await db('player_inventory')
      .where({ player_id: userId })
      .sum<{ total_items: string | null }[]>('quantity as total_items');

    return {
      total_elementals: Number(elementalStats?.total_elementals || 0),
      active_elementals: Number(elementalStats?.active_elementals || 0),
      backpack_elementals: Number(elementalStats?.backpack_elementals || 0),
      total_dice: Number(diceStats?.total_dice || 0),
      total_items: Number(itemStats?.total_items || 0),
    };
  }
}
