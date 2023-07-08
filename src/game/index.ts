interface IShipData {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

interface IShipsPlayer {
  playerIndex: number;
  ships: IShipData[];
}

export class BattleshipGame {
  static id = 0;
  gameId: number;
  currentPlayer: number | null = null;
  shipsForPlayer: IShipsPlayer[] = [];
  ships: IShipData[] = [];

  constructor() {
    this.gameId = BattleshipGame.id;
    BattleshipGame.id++;
  }

  setCurrentPlayer(id: number) {
    this.currentPlayer = id;
  }

  addShips(idPlayer: number, ships: IShipData[]) {
    this.shipsForPlayer.push({
      playerIndex: idPlayer,
      ships,
    });
  }
}
