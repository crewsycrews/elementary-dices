import { db } from '../../db';
import type { CreateElementalData, UpdateElementalData, Elemental, ElementalQuery } from './models';

export class ElementalRepository {
  private table = 'elementals';

  async findAll(query?: ElementalQuery): Promise<Elemental[]> {
    let queryBuilder = db(this.table).select('*');

    if (query?.level) {
      queryBuilder = queryBuilder.where('level', query.level);
    }

    if (query?.is_base_elemental !== undefined) {
      queryBuilder = queryBuilder.where('is_base_elemental', query.is_base_elemental);
    }

    if (query?.element_type) {
      // Query JSONB array for element type
      queryBuilder = queryBuilder.whereRaw(
        `element_types @> ?::jsonb`,
        [JSON.stringify([query.element_type])]
      );
    }

    return queryBuilder.orderBy('level', 'asc').orderBy('name', 'asc');
  }

  async findById(id: string): Promise<Elemental | null> {
    const [elemental] = await db(this.table).where({ id }).limit(1);
    return elemental || null;
  }

  async findByLevel(level: number): Promise<Elemental[]> {
    return db(this.table).where({ level }).orderBy('name', 'asc');
  }

  async findBaseElementals(): Promise<Elemental[]> {
    return db(this.table)
      .where({ is_base_elemental: true })
      .orderBy('name', 'asc');
  }

  async findByElementType(elementType: string): Promise<Elemental[]> {
    return db(this.table)
      .whereRaw(
        `element_types @> ?::jsonb`,
        [JSON.stringify([elementType])]
      )
      .orderBy('level', 'asc')
      .orderBy('name', 'asc');
  }

  async create(data: CreateElementalData): Promise<Elemental> {
    const [elemental] = await db(this.table)
      .insert({
        ...data,
        element_types: JSON.stringify(data.element_types),
        base_stats: JSON.stringify(data.base_stats),
      })
      .returning('*');
    return elemental;
  }

  async update(id: string, data: UpdateElementalData): Promise<Elemental | null> {
    const updateData: any = { ...data };

    if (data.element_types) {
      updateData.element_types = JSON.stringify(data.element_types);
    }

    if (data.base_stats) {
      updateData.base_stats = JSON.stringify(data.base_stats);
    }

    const [elemental] = await db(this.table)
      .where({ id })
      .update(updateData)
      .returning('*');

    return elemental || null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db(this.table).where({ id }).delete();
    return deleted > 0;
  }

  async count(): Promise<number> {
    const [{ count }] = await db(this.table).count('* as count');
    return Number(count);
  }
}
