import { BattleshipGame } from '../game';
import { IUser } from '../interfaces/user';

// interface IShipsPlayer {
//   playerIndex: number;
//   ships: IShipData[];
// }

export class Room {
  static id = 0;
  roomId: number;
  roomUsers: IUser[] = [];
  game: BattleshipGame | null = null;
  // shipsForPlayer: IShipsPlayer[] = [];

  constructor() {
    this.roomId = Room.id;
    Room.id++;
  }

  createGame() {
    this.game = new BattleshipGame();
    return this.game;
  }

  addUser(user: IUser) {
    this.roomUsers.push(user);
  }

  // addShips(idPlayer: number, ships: IShipData[]) {
  //   this.shipsForPlayer.push({
  //     playerIndex: idPlayer,
  //     ships,
  //   });
  // }
}
