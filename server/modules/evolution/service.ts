import { EvolutionRepository } from './repository';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { db } from '../../db';
import type { CombineElementalsData, CombineResult, EvolutionRecipe } from './models';

export class EvolutionService {
  constructor(private repository = new EvolutionRepository()) {}

  async findAll(): Promise<EvolutionRecipe[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<EvolutionRecipe> {
    const recipe = await this.repository.findById(id);
    if (!recipe) {
      throw new NotFoundError('Evolution recipe');
    }
    return recipe;
  }

  async getPlayerDiscoveries(playerId: string): Promise<EvolutionRecipe[]> {
    return this.repository.getPlayerDiscoveries(playerId);
  }

  /**
   * Combine elementals to create a new evolved elemental
   */
  async combineElementals(data: CombineElementalsData): Promise<CombineResult> {
    // Validate player owns all elementals
    const playerElementals = await db('player_elementals')
      .whereIn('player_elementals.id', data.player_elemental_ids)
      .where('player_id', data.player_id)
      .leftJoin('elementals', 'player_elementals.elemental_id', 'elementals.id')
      .select(
        'player_elementals.id as player_elemental_id',
        'player_elementals.elemental_id',
        'elementals.name',
        'elementals.level',
        'elementals.element_types'
      );

    if (playerElementals.length !== data.player_elemental_ids.length) {
      throw new BadRequestError('Some elementals not found or do not belong to player');
    }

    // Check if player has enough elementals (2 or 3)
    if (playerElementals.length < 2 || playerElementals.length > 3) {
      throw new BadRequestError('Can only combine 2 or 3 elementals at a time');
    }

    // Find matching evolution recipe
    const recipe = await this.findMatchingRecipe(playerElementals);

    if (!recipe) {
      return {
        success: false,
        message: 'No evolution recipe found for these elementals. Try different combinations!',
        consumed_elementals: [],
      };
    }

    // Check if player discovered this recipe
    const wasDiscovered = await this.repository.checkPlayerDiscovered(data.player_id, recipe.id);

    const [resultElementalData] = await db('elementals')
      .where({ id: recipe.result_elemental_id })
      .select('base_stats', 'name', 'level')
      .limit(1);

    if (!resultElementalData) {
      throw new BadRequestError('Result elemental not found');
    }

    // Create new evolved elemental in player's collection
    const [newPlayerElemental] = await db('player_elementals')
      .insert({
        player_id: data.player_id,
        elemental_id: recipe.result_elemental_id,
        current_stats: resultElementalData.base_stats,
        is_in_active_party: false,
        party_position: null,
      })
      .returning('*');

    const newElemental = {
      name: resultElementalData.name,
      level: resultElementalData.level,
    };

    // Delete consumed elementals
    await db('player_elementals')
      .whereIn('id', data.player_elemental_ids)
      .delete();

    // Mark recipe as discovered if not already
    if (!wasDiscovered && !recipe.is_discovered_by_default) {
      await this.repository.markDiscovered(data.player_id, recipe.id);
    }

    return {
      success: true,
      message: `Successfully evolved into ${newElemental.name}!`,
      new_elemental: {
        id: newPlayerElemental.id,
        elemental_id: recipe.result_elemental_id,
        elemental_name: newElemental.name,
        level: newElemental.level,
      },
      consumed_elementals: data.player_elemental_ids,
      recipe_discovered: !wasDiscovered && !recipe.is_discovered_by_default,
    };
  }

  /**
   * Find matching evolution recipe for given elementals
   */
  private async findMatchingRecipe(elementals: any[]): Promise<EvolutionRecipe | null> {
    const count = elementals.length;
    const level = elementals[0].level; // All should be same level for evolution

    // Check if all elementals are same level
    if (!elementals.every(e => e.level === level)) {
      return null;
    }

    // Case 1: Same element evolution (3 of same element -> next level)
    if (count === 3) {
      const elements = elementals.map(e => e.element_types[0]);
      const allSameElement = elements.every(el => el === elements[0]);

      if (allSameElement) {
        const recipes = await this.repository.findBySameElement(elements[0], 3);
        return recipes.find(r => r.required_level === level) || null;
      }
    }

    // Case 2: Hybrid evolution (2 different elements -> hybrid)
    if (count === 2) {
      const element1 = elementals[0].element_types[0];
      const element2 = elementals[1].element_types[0];

      if (element1 !== element2) {
        const recipes = await this.repository.findByElements(element1, element2, 2);
        return recipes.find(r => r.required_level === level) || null;
      }
    }

    // Case 3: Specific elemental combination (for higher level evolutions)
    const elementalIds = elementals.map(e => e.elemental_id).sort();
    const allRecipes = await this.repository.findByLevel(level);

    for (const recipe of allRecipes) {
      if (recipe.required_elemental_ids) {
        const requiredIds = [...recipe.required_elemental_ids].sort();
        if (JSON.stringify(elementalIds) === JSON.stringify(requiredIds)) {
          return recipe;
        }
      }
    }

    return null;
  }
}
