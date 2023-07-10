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

export { IShipData, IShipsPlayer, IField, IShipNumber, InfoField };
