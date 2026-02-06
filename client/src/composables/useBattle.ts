import { ref, computed } from 'vue';
import type { PlayerElementalSchema, ElementalSchema, StatsSchema } from '@elementary-dices/shared/schemas';

export interface BattleParticipant {
  playerElemental: typeof PlayerElementalSchema.static;
  elemental: typeof ElementalSchema.static;
}

export interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerDamageDealt: number;
  opponentDamageDealt: number;
  rounds: BattleRound[];
  summary: string;
}

export interface BattleRound {
  round: number;
  playerAttack: number;
  opponentAttack: number;
  playerDamage: number;
  opponentDamage: number;
  playerHealthRemaining: number;
  opponentHealthRemaining: number;
}

export function useBattle() {
  const isBattleActive = ref(false);
  const currentRound = ref(0);
  const battleLog = ref<string[]>([]);

  /**
   * Calculate effective damage based on attack and defense
   * Formula: damage = max(1, attack - (defense / 2))
   */
  const calculateDamage = (attack: number, defense: number): number => {
    return Math.max(1, Math.floor(attack - defense / 2));
  };

  /**
   * Determine turn order based on speed stat
   */
  const determineTurnOrder = (
    playerSpeed: number,
    opponentSpeed: number
  ): 'player' | 'opponent' => {
    if (playerSpeed > opponentSpeed) return 'player';
    if (opponentSpeed > playerSpeed) return 'opponent';

    // Equal speed - random
    return Math.random() > 0.5 ? 'player' : 'opponent';
  };

  /**
   * Calculate battle power - sum of all stats
   */
  const calculatePower = (stats: typeof StatsSchema.static): number => {
    return stats.health + stats.attack + stats.defense + stats.speed;
  };

  /**
   * Simulate a battle between player's party and opponent
   * This is a turn-based calculation, not real-time
   */
  const simulateBattle = (
    playerParty: BattleParticipant[],
    opponentParty: BattleParticipant[]
  ): BattleResult => {
    battleLog.value = [];
    const rounds: BattleRound[] = [];

    // Use first elemental from each party (can be extended for full party battles)
    const player = playerParty[0];
    const opponent = opponentParty[0];

    if (!player || !opponent) {
      throw new Error('Both parties must have at least one elemental');
    }

    let playerHealth = player.playerElemental.current_stats.health;
    let opponentHealth = opponent.playerElemental.current_stats.health;

    let totalPlayerDamage = 0;
    let totalOpponentDamage = 0;
    let round = 0;

    battleLog.value.push(`Battle Start!`);
    battleLog.value.push(
      `${player.elemental.name} (HP: ${playerHealth}) vs ${opponent.elemental.name} (HP: ${opponentHealth})`
    );

    // Battle loop - max 50 rounds to prevent infinite battles
    while (playerHealth > 0 && opponentHealth > 0 && round < 50) {
      round++;

      // Determine who attacks first based on speed
      const firstAttacker = determineTurnOrder(
        player.playerElemental.current_stats.speed,
        opponent.playerElemental.current_stats.speed
      );

      let playerDamage = 0;
      let opponentDamage = 0;

      if (firstAttacker === 'player') {
        // Player attacks first
        playerDamage = calculateDamage(
          player.playerElemental.current_stats.attack,
          opponent.playerElemental.current_stats.defense
        );
        opponentHealth -= playerDamage;
        totalPlayerDamage += playerDamage;

        battleLog.value.push(
          `Round ${round}: ${player.elemental.name} attacks for ${playerDamage} damage!`
        );

        // Opponent counter-attacks if still alive
        if (opponentHealth > 0) {
          opponentDamage = calculateDamage(
            opponent.playerElemental.current_stats.attack,
            player.playerElemental.current_stats.defense
          );
          playerHealth -= opponentDamage;
          totalOpponentDamage += opponentDamage;

          battleLog.value.push(
            `Round ${round}: ${opponent.elemental.name} counter-attacks for ${opponentDamage} damage!`
          );
        }
      } else {
        // Opponent attacks first
        opponentDamage = calculateDamage(
          opponent.playerElemental.current_stats.attack,
          player.playerElemental.current_stats.defense
        );
        playerHealth -= opponentDamage;
        totalOpponentDamage += opponentDamage;

        battleLog.value.push(
          `Round ${round}: ${opponent.elemental.name} attacks for ${opponentDamage} damage!`
        );

        // Player counter-attacks if still alive
        if (playerHealth > 0) {
          playerDamage = calculateDamage(
            player.playerElemental.current_stats.attack,
            opponent.playerElemental.current_stats.defense
          );
          opponentHealth -= playerDamage;
          totalPlayerDamage += playerDamage;

          battleLog.value.push(
            `Round ${round}: ${player.elemental.name} counter-attacks for ${playerDamage} damage!`
          );
        }
      }

      // Record round
      rounds.push({
        round,
        playerAttack: player.playerElemental.current_stats.attack,
        opponentAttack: opponent.playerElemental.current_stats.attack,
        playerDamage,
        opponentDamage,
        playerHealthRemaining: Math.max(0, playerHealth),
        opponentHealthRemaining: Math.max(0, opponentHealth),
      });
    }

    // Determine winner
    let winner: 'player' | 'opponent' | 'draw';
    let summary: string;

    if (playerHealth > 0 && opponentHealth <= 0) {
      winner = 'player';
      summary = `${player.elemental.name} wins the battle!`;
      battleLog.value.push(`🎉 Victory! ${summary}`);
    } else if (opponentHealth > 0 && playerHealth <= 0) {
      winner = 'opponent';
      summary = `${opponent.elemental.name} wins the battle!`;
      battleLog.value.push(`💀 Defeat! ${summary}`);
    } else {
      winner = 'draw';
      summary = 'The battle ends in a draw!';
      battleLog.value.push(`🤝 ${summary}`);
    }

    return {
      winner,
      playerDamageDealt: totalPlayerDamage,
      opponentDamageDealt: totalOpponentDamage,
      rounds,
      summary,
    };
  };

  /**
   * Calculate battle odds based on party power levels
   */
  const calculateBattleOdds = (
    playerParty: BattleParticipant[],
    opponentParty: BattleParticipant[]
  ): {
    playerWinChance: number;
    opponentWinChance: number;
    playerPower: number;
    opponentPower: number;
  } => {
    const playerPower = playerParty.reduce(
      (sum, p) => sum + calculatePower(p.playerElemental.current_stats),
      0
    );

    const opponentPower = opponentParty.reduce(
      (sum, p) => sum + calculatePower(p.playerElemental.current_stats),
      0
    );

    const totalPower = playerPower + opponentPower;

    return {
      playerWinChance: Math.round((playerPower / totalPower) * 100),
      opponentWinChance: Math.round((opponentPower / totalPower) * 100),
      playerPower,
      opponentPower,
    };
  };

  /**
   * Check if elemental type has advantage over another
   * Fire > Earth > Lightning > Water > Fire
   * Air is neutral
   */
  const hasTypeAdvantage = (attackerType: string, defenderType: string): boolean => {
    const advantages: Record<string, string[]> = {
      fire: ['earth'],
      earth: ['lightning'],
      lightning: ['water'],
      water: ['fire'],
      air: [], // Neutral
    };

    return advantages[attackerType]?.includes(defenderType) || false;
  };

  /**
   * Apply type advantage modifier to damage (1.5x if advantage)
   */
  const applyTypeAdvantage = (
    damage: number,
    attackerElements: string[],
    defenderElements: string[]
  ): number => {
    const hasAdvantage = attackerElements.some(attacker =>
      defenderElements.some(defender => hasTypeAdvantage(attacker, defender))
    );

    return hasAdvantage ? Math.floor(damage * 1.5) : damage;
  };

  return {
    isBattleActive,
    currentRound,
    battleLog,
    simulateBattle,
    calculateBattleOdds,
    calculateDamage,
    calculatePower,
    hasTypeAdvantage,
    applyTypeAdvantage,
  };
}
