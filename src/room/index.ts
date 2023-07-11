import { BattleshipGame } from '../game';
import { IUser } from '../interfaces/user';

export class Room {
  static id = 0;
  roomId: number;
  roomUsers: IUser[] = [];
  game: BattleshipGame | null = null;

  constructor() {
    this.roomId = Room.id;
    Room.id++;
  }

  createGame(): BattleshipGame {
    this.game = new BattleshipGame();
    return this.game;
  }

  addUser(user: IUser): void {
    this.roomUsers.push(user);
  }
}
