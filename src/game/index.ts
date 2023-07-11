import { IShipData, IShipsPlayer, IField, IShipNumber, InfoField } from '../interfaces/game';

export class BattleshipGame {
  static id = 0;
  gameId: number;
  isFinish = false;
  winner: number | null = null;
  currentPlayer: number | null = null;
  shipsForPlayer: IShipsPlayer[] = [];
  private fieldsForPlayer: IField[] = [];
  private numberSunkShipsForPlayer: IShipNumber[] = [];

  constructor() {
    this.gameId = BattleshipGame.id;
    BattleshipGame.id++;
  }

  setCurrentPlayer(id: number): void {
    this.currentPlayer = id;
  }

  addShips(idPlayer: number, ships: IShipData[]): void {
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

  attack(x: number, y: number): 'miss' | 'killed' | 'shot' | 'Already attacked' | undefined {
    const fieldData = this.fieldsForPlayer.find((data) => data.playerIndex !== this.currentPlayer);

    const cell = fieldData?.field[y][x];

    if (cell === InfoField.None) {
      if (fieldData) fieldData.field[y][x] = InfoField.Miss;

      return 'miss';
    } else if (cell === InfoField.Healthy) {
      if (fieldData) {
        fieldData.field[y][x] = InfoField.Hit;

        if (this.checkShipKilled(fieldData.field, x, y)) {
          if (fieldData) fieldData.field[y][x] = InfoField.Killed;

          //if (this.currentPlayer) this.increaseShipsForPlayer(this.currentPlayer);
          this.increaseShipsForPlayer(this.currentPlayer!);

          this.checkIsFinish();

          return 'killed';
        } else {
          return 'shot';
        }
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

    const dfs = (currX: number, currY: number): boolean => {
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
    };

    return dfs(x, y);
  }

  getSurroundingCoordinates(
    x: number,
    y: number
  ): {
    surroundingCoordinates: { x: number; y: number }[];
    killedCoordinates: { x: number; y: number }[];
  } {
    const gameBoard = this.fieldsForPlayer.find(
      (data) => data.playerIndex !== this.currentPlayer
    )?.field;

    let surroundingCoordinates: { x: number; y: number }[] = [];
    const killedCoordinates: { x: number; y: number }[] = [];
    killedCoordinates.push({ x, y });

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 1, dy: -1 },
      { dx: 1, dy: 1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: -1 },
    ];

    const dfs = (currX: number, currY: number): void => {
      for (const direction of directions) {
        const { dx, dy } = direction;
        const adjacentX = currX + dx;
        const adjacentY = currY + dy;

        if (adjacentX >= 0 && adjacentX < 10 && adjacentY >= 0 && adjacentY < 10) {
          if (gameBoard && gameBoard[adjacentY][adjacentX] === InfoField.Hit) {
            if (gameBoard) gameBoard[adjacentY][adjacentX] = InfoField.Killed;
            killedCoordinates.push({ x: adjacentX, y: adjacentY });

            dfs(adjacentX, adjacentY);
          } else {
            surroundingCoordinates.push({ x: adjacentX, y: adjacentY });
          }
        }
      }
    };

    dfs(x, y);

    surroundingCoordinates = surroundingCoordinates.filter(
      (coord, index, array) =>
        array.findIndex((c) => c.x === coord.x && c.y === coord.y) === index &&
        !killedCoordinates.some(
          (killedCoord) => killedCoord.x === coord.x && killedCoord.y === coord.y
        )
    );

    return { surroundingCoordinates, killedCoordinates };
  }

  randomAttack(idPlayer: number):
    | {
        status: 'miss' | 'shot' | 'killed' | 'Already attacked' | undefined;
        x: number;
        y: number;
      }
    | undefined {
    const fieldData = this.fieldsForPlayer.find((data) => data.playerIndex !== idPlayer);

    const rows = fieldData?.field.length;
    const columns = fieldData?.field[0].length;

    const allCoordinates = [];
    if (rows && columns) {
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
          allCoordinates.push({ x: j, y: i });
        }
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

  private increaseShipsForPlayer(playerIndex: number): void {
    const playerObj = this.numberSunkShipsForPlayer.find((obj) => obj.playerIndex === playerIndex);

    if (playerObj) {
      playerObj.ships += 1;
    } else {
      this.numberSunkShipsForPlayer.push({ playerIndex, ships: 1 });
    }
    //console.log(this.numberSunkShipsForPlayer);
  }

  private checkIsFinish(): void {
    const playerWinner = this.numberSunkShipsForPlayer.find((obj) => obj.ships === 10);

    if (playerWinner) {
      this.isFinish = true;
      this.winner = playerWinner.playerIndex;
    } else {
      this.isFinish = false;
      this.winner = null;
    }
  }
}
