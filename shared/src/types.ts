/**
 * Shared types between client and server
 */

export interface GameState {
  playerCount: number;
  gameStatus: "waiting" | "running" | "finished";
}

export interface DiceRoll {
  playerId: string;
  value: number;
  timestamp: number;
}

export interface GameMessage {
  type: "roll" | "update" | "gameStart" | "gameEnd";
  payload: unknown;
}
