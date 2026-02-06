import { db } from '../../db';
import { BadRequestError } from '../../shared/errors';
import type {
  EventType,
  EventResponse,
  WildEncounterData,
  MerchantData,
  PvPData,
} from './models';
import { EVENT_PROBABILITIES } from './models';

export class EventService {
  /**
   * Trigger a random event based on probabilities
   * 50% wild encounter, 30% PvP, 20% merchant
   */
  async triggerEvent(playerId: string): Promise<EventResponse> {
    // Determine event type based on probabilities
    const eventType = this.determineEventType();

    // Generate event-specific data
    switch (eventType) {
      case 'wild_encounter':
        return this.generateWildEncounter();
      case 'pvp_battle':
        return this.generatePvPBattle(playerId);
      case 'merchant':
        return this.generateMerchantEvent();
      default:
        throw new BadRequestError('Unknown event type');
    }
  }

  /**
   * Determine event type based on weighted probabilities
   */
  private determineEventType(): EventType {
    const random = Math.random();
    let cumulative = 0;

    // Check wild encounter (50%)
    cumulative += EVENT_PROBABILITIES.wild_encounter;
    if (random < cumulative) {
      return 'wild_encounter';
    }

    // Check PvP (30%)
    cumulative += EVENT_PROBABILITIES.pvp_battle;
    if (random < cumulative) {
      return 'pvp_battle';
    }

    // Otherwise merchant (20%)
    return 'merchant';
  }

  /**
   * Generate a wild encounter event
   * Randomly selects an elemental from the database
   */
  private async generateWildEncounter(): Promise<EventResponse> {
    // Get a random elemental from the database
    // Prefer base elementals (level 1) for wild encounters
    const elementals = await db('elementals')
      .where({ is_base_elemental: true })
      .select('*');

    if (elementals.length === 0) {
      throw new BadRequestError('No elementals available for wild encounter');
    }

    const randomElemental = elementals[Math.floor(Math.random() * elementals.length)];

    // Determine capture difficulty based on elemental level
    let captureDifficulty: 'easy' | 'medium' | 'hard';
    if (randomElemental.level === 1) {
      captureDifficulty = 'easy';
    } else if (randomElemental.level === 2) {
      captureDifficulty = 'medium';
    } else {
      captureDifficulty = 'hard';
    }

    const data: WildEncounterData = {
      elemental_id: randomElemental.id,
      elemental_name: randomElemental.name,
      elemental_level: randomElemental.level,
      capture_difficulty: captureDifficulty,
    };

    return {
      event_type: 'wild_encounter',
      description: `A wild ${randomElemental.name} appeared! You can attempt to capture it using a dice roll and a capture item.`,
      data,
    };
  }

  /**
   * Generate a PvP battle event
   * Creates a simulated opponent or matches with another player
   */
  private async generatePvPBattle(playerId: string): Promise<EventResponse> {
    // For now, generate a simulated opponent
    // In the future, this could match with real players

    // Get player's active elementals to determine power level
    const playerElementals = await db('player_elementals')
      .where({ player_id: playerId, is_in_active_party: true })
      .leftJoin('elementals', 'player_elementals.elemental_id', 'elementals.id')
      .select('elementals.*', 'player_elementals.current_stats');

    const playerPowerLevel = this.calculatePowerLevel(playerElementals);

    // Generate opponent with similar power level (+/- 20%)
    const variance = 0.2;
    const minPower = Math.floor(playerPowerLevel * (1 - variance));
    const maxPower = Math.ceil(playerPowerLevel * (1 + variance));
    const opponentPowerLevel = Math.floor(Math.random() * (maxPower - minPower + 1)) + minPower;

    // Calculate potential reward based on opponent power
    const potentialReward = Math.floor(opponentPowerLevel * 10);

    const data: PvPData = {
      opponent_name: this.generateOpponentName(),
      opponent_power_level: opponentPowerLevel,
      potential_reward: potentialReward,
    };

    return {
      event_type: 'pvp_battle',
      description: `You've been challenged by ${data.opponent_name} to a battle! Win to earn ${potentialReward} currency.`,
      data,
    };
  }

  /**
   * Generate a merchant event
   * Offers random items and dice for sale
   */
  private async generateMerchantEvent(): Promise<EventResponse> {
    // Get random items (2-4 items)
    const itemCount = Math.floor(Math.random() * 3) + 2;
    const allItems = await db('items').select('id', 'name', 'price', 'rarity');
    const availableItems = this.getRandomItems(allItems, itemCount);

    // Get random dice (2-3 dice)
    const diceCount = Math.floor(Math.random() * 2) + 2;
    const allDice = await db('dice_types').select('id', 'name', 'price', 'rarity');
    const availableDice = this.getRandomItems(allDice, diceCount);

    const data: MerchantData = {
      available_items: availableItems,
      available_dice: availableDice,
    };

    return {
      event_type: 'merchant',
      description: 'A traveling merchant has appeared! Browse their wares and make a purchase.',
      data,
    };
  }

  /**
   * Calculate total power level from elementals
   */
  private calculatePowerLevel(elementals: any[]): number {
    if (elementals.length === 0) return 100; // Default power level

    return elementals.reduce((total, elemental) => {
      const stats = elemental.current_stats;
      return total + stats.health + stats.attack + stats.defense + stats.speed;
    }, 0);
  }

  /**
   * Generate a random opponent name
   */
  private generateOpponentName(): string {
    const prefixes = ['Brave', 'Fierce', 'Cunning', 'Swift', 'Mighty', 'Wise', 'Dark', 'Noble'];
    const names = ['Warrior', 'Mage', 'Hunter', 'Champion', 'Knight', 'Elementalist', 'Duelist', 'Summoner'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const name = names[Math.floor(Math.random() * names.length)];

    return `${prefix} ${name}`;
  }

  /**
   * Get random items from array
   */
  private getRandomItems<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, items.length));
  }

  /**
   * Get event type probabilities
   */
  getEventProbabilities() {
    return EVENT_PROBABILITIES;
  }
}
