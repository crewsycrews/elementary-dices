import { ElementalRepository } from './repository';
import { NotFoundError } from '../../shared/errors';
import type { CreateElementalData, UpdateElementalData, Elemental, ElementalQuery } from './models';

export class ElementalService {
  constructor(private repository = new ElementalRepository()) {}

  async findAll(query?: ElementalQuery): Promise<Elemental[]> {
    return this.repository.findAll(query);
  }

  async findById(id: string): Promise<Elemental> {
    const elemental = await this.repository.findById(id);
    if (!elemental) {
      throw new NotFoundError('Elemental');
    }
    return elemental;
  }

  async findByLevel(level: number): Promise<Elemental[]> {
    return this.repository.findByLevel(level);
  }

  async findBaseElementals(): Promise<Elemental[]> {
    return this.repository.findBaseElementals();
  }

  async findByElementType(elementType: string): Promise<Elemental[]> {
    return this.repository.findByElementType(elementType);
  }

  async create(data: CreateElementalData): Promise<Elemental> {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateElementalData): Promise<Elemental> {
    const elemental = await this.repository.update(id, data);
    if (!elemental) {
      throw new NotFoundError('Elemental');
    }
    return elemental;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Elemental');
    }
  }

  async getStats(): Promise<{ total: number; by_level: Record<number, number> }> {
    const all = await this.repository.findAll();
    const byLevel: Record<number, number> = {};

    all.forEach((elemental) => {
      byLevel[elemental.level] = (byLevel[elemental.level] || 0) + 1;
    });

    return {
      total: all.length,
      by_level: byLevel,
    };
  }
}
