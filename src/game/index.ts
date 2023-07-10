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

interface IShipNumber {
  playerIndex: number;
  ships: number;
}

enum InfoField {
  None = 'none',
  Healthy = 'healthy',
  Hit = 'hit',
  Miss = 'miss',
  Killed = 'killed',
}

export class BattleshipGame {
  static id = 0;
  gameId: number;
  isFinish = false;
  winner: number | null = null;
  currentPlayer: number | null = null;
  shipsForPlayer: IShipsPlayer[] = [];
  private fieldsForPlayer: IField[] = [];
  numberSunkShipsForPlayer: IShipNumber[] = [];

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

  private createField(idPlayer: number, ships: IShipData[]): void {
    const gameBoard: string[][] = new Array(10).fill(null).map(() => new Array(10).fill('none'));

    ships.forEach((ship) => {
      const { position, direction, length } = ship;
      const { x, y } = position;

      if (direction) {
        for (let i = y; i < y + length; i++) {
          gameBoard[i][x] = 'healthy';
        }
      } else {
        for (let i = x; i < x + length; i++) {
          gameBoard[y][i] = 'healthy';
        }
      }
    });

    this.fieldsForPlayer.push({ playerIndex: idPlayer, field: gameBoard });
  }

  attack(x: number, y: number) {
    const fieldData = this.fieldsForPlayer.find((data) => data.playerIndex !== this.currentPlayer);

    const cell = fieldData?.field[y][x];
    if (cell === InfoField.None) {
      fieldData!.field[y][x] = InfoField.Miss;
      return 'miss';
    } else if (cell === InfoField.Healthy) {
      fieldData!.field[y][x] = InfoField.Hit;
      if (this.checkShipKilled(fieldData!.field, x, y)) {
        fieldData!.field[y][x] = InfoField.Killed;

        this.increaseShipsForPlayer(this.currentPlayer!);
        this.checkIsFinish();
        return 'killed';
      } else {
        return 'shot';
      }
    } else if (cell === InfoField.Hit) {
      return 'Already attacked';
    }
  }

  private checkShipKilled(gameBoard: string[][], x: number, y: number): boolean {
    const visited: boolean[][] = [];

    for (let i = 0; i < 10; i++) {
      visited[i] = [];
      for (let j = 0; j < 10; j++) {
        visited[i][j] = false;
      }
    }

    function dfs(currX: number, currY: number): boolean {
      if (currX < 0 || currX >= 10 || currY < 0 || currY >= 10 || visited[currY][currX]) {
        return true;
      }

      visited[currY][currX] = true;

      if (gameBoard[currY][currX] === InfoField.Healthy) {
        return false;
      }

      if (gameBoard[currY][currX] === InfoField.Hit) {
        return (
          dfs(currX + 1, currY) &&
          dfs(currX - 1, currY) &&
          dfs(currX, currY + 1) &&
          dfs(currX, currY - 1)
        );
      }
      return true;
    }
    return dfs(x, y);
  }

  randomAttack(idPlayer: number) {
    const fieldData = this.fieldsForPlayer.find((data) => data.playerIndex !== idPlayer);

    const rows = fieldData?.field.length;
    const columns = fieldData?.field[0].length;

    const allCoordinates = [];
    for (let i = 0; i < rows!; i++) {
      for (let j = 0; j < columns!; j++) {
        allCoordinates.push({ x: j, y: i });
      }
    }

    const availableCoordinates = allCoordinates.filter(
      ({ x, y }) =>
        fieldData?.field[y][x] !== 'miss' ||
        (fieldData?.field[y][x] !== 'shot' && fieldData?.field[y][x] !== 'killed')
    );

    if (availableCoordinates.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCoordinates.length);
      const { x, y } = availableCoordinates[randomIndex];

      const status = this.attack(x, y);
      return { status, x, y };
    }
  }

  private increaseShipsForPlayer(playerIndex: number) {
    const playerObj = this.numberSunkShipsForPlayer.find((obj) => obj.playerIndex === playerIndex);

    if (playerObj) {
      playerObj.ships += 1;
    } else {
      this.numberSunkShipsForPlayer.push({ playerIndex, ships: 1 });
    }
    console.log(this.numberSunkShipsForPlayer);
  }

  private checkIsFinish() {
    const playerWinner = this.numberSunkShipsForPlayer.find((obj) => obj.ships === 10);

    if (playerWinner) {
      this.isFinish = true;
      this.winner = playerWinner!.playerIndex;
    } else {
      this.isFinish = false;
      this.winner = null;
    }
  }
}
