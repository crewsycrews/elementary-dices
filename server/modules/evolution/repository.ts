import { db } from "../../db";
import type { EvolutionRecipe } from "./models";

export class EvolutionRepository {
  private table = "elemental_evolutions";

  async findAll(): Promise<EvolutionRecipe[]> {
    return db(this.table).select("*").orderBy("required_level", "asc");
  }

  async findById(id: string): Promise<EvolutionRecipe | null> {
    const [recipe] = await db(this.table).where({ id }).limit(1);
    return recipe || null;
  }

  async findByLevel(level: number): Promise<EvolutionRecipe[]> {
    return db(this.table).where({ required_level: level });
  }

  async findBySameElement(
    element: string,
    count: number,
  ): Promise<EvolutionRecipe[]> {
    return db(this.table)
      .where({ required_same_element: element, required_count: count })
      .select("*");
  }

  async findByElements(
    element1: string,
    element2: string,
    count: number,
  ): Promise<EvolutionRecipe[]> {
    return db(this.table)
      .where({ required_count: count })
      .andWhere(function () {
        this.where({
          required_element_1: element1,
          required_element_2: element2,
        }).orWhere({
          required_element_1: element2,
          required_element_2: element1,
        });
      })
      .select("*");
  }

  async findByResultElemental(
    elementalId: string,
  ): Promise<EvolutionRecipe | null> {
    const [recipe] = await db(this.table)
      .where({ result_elemental_id: elementalId })
      .limit(1);
    return recipe || null;
  }

  async checkPlayerDiscovered(
    playerId: string,
    recipeId: string,
  ): Promise<boolean> {
    const [discovery] = await db("player_discoveries")
      .where({ player_id: playerId, elemental_evolution_id: recipeId })
      .limit(1);
    return !!discovery;
  }

  async markDiscovered(playerId: string, recipeId: string): Promise<void> {
    await db("player_discoveries")
      .insert({
        player_id: playerId,
        elemental_evolution_id: recipeId,
      })
      .onConflict(["player_id", "elemental_evolution_id"])
      .ignore();
  }

  async getPlayerDiscoveries(playerId: string): Promise<EvolutionRecipe[]> {
    return db(this.table)
      .leftJoin("player_discoveries", function () {
        this.on(
          "elemental_evolutions.id",
          "=",
          "player_discoveries.elemental_evolution_id",
        ).andOn("player_discoveries.player_id", "=", db.raw("?", [playerId]));
      })
      .where("elemental_evolutions.is_discovered_by_default", true)
      .orWhereNotNull("player_discoveries.id")
      .select("elemental_evolutions.*")
      .orderBy("elemental_evolutions.required_level", "asc");
  }
}
