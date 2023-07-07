enum Player {
  Player1 = 'Player 1',
  Player2 = 'Player 2',
}

interface IShipData {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export class BattleshipGame {
  static id = 0;
  gameId: number;
  currentPlayer: number | null = null;
  ships: IShipData[] = [];

  constructor() {
    this.gameId = BattleshipGame.id;
    BattleshipGame.id++;
  }

  setCurrentPlayer(id: number) {
    this.currentPlayer = id;
  }
}
