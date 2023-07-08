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

interface IField {
  playerIndex: number;
  field: string[][];
}

export class BattleshipGame {
  static id = 0;
  gameId: number;
  currentPlayer: number | null = null;
  shipsForPlayer: IShipsPlayer[] = [];
  fieldsForPlayer: IField[] = [];
  //ships: IShipData[] = [];

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

    this.createField(idPlayer, ships);
  }

  createField(idPlayer: number, ships: IShipData[]): void {
    const gameBoard: string[][] = [];

    for (let y = 0; y < 10; y++) {
      gameBoard[y] = [];

      for (let x = 0; x < 10; x++) {
        gameBoard[y][x] = 'none';
      }
    }

    ships.forEach((ship) => {
      const { position, direction, length } = ship;
      const { x, y } = position;

      if (direction) {
        if (x + length <= 10) {
          for (let i = 0; i < length; i++) {
            gameBoard[y + i][x] = 'healthy';
          }
        }
      } else {
        if (y + length <= 10) {
          for (let i = 0; i < length; i++) {
            gameBoard[y][x + i] = 'healthy';
          }
        }
      }
    });

    this.fieldsForPlayer.push({ playerIndex: idPlayer, field: gameBoard });

    // console.log(gameBoard);
    // console.log('\n\n');
  }
}
