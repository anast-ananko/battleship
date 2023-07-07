import { BattleshipGame } from '../game';

export interface IUser {
  name: string;
  password: string;
  id: number;
}

// interface IRoom {
//   roomId: number;
//   roomUsers: IUser[];
// }

export class Room {
  static id = 0;
  roomId: number;
  roomUsers: IUser[] = [];
  game: BattleshipGame | null = null;

  constructor() {
    this.roomId = Room.id;
    Room.id++;
  }

  createGame() {
    this.game = new BattleshipGame();
    return this.game.gameId;
  }

  addUser(user: IUser) {
    this.roomUsers.push(user);
  }
}
