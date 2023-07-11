import WebSocket from 'ws';

import { Commands } from '../interfaces/server';
import { IWinner } from '../interfaces/winner';
import { wss } from '../ws_server';

export const updateWinners = (winnersMap: Map<number, IWinner>) => {
  const data = [];
  for (const winner of winnersMap.values()) {
    data.push({ name: winner.winner.name, wins: winner.wins });
  }

  const dataString = JSON.stringify(data);
  const jsonString = JSON.stringify({
    type: Commands.Update_winners,
    data: dataString,
    id: 0,
  });

  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonString);
    }
  });
};
