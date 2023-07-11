import WebSocket from 'ws';

import { Room } from '../room';
import { IUser } from '../interfaces/user';
import { Commands } from '../interfaces/server';
import { wss } from '../ws_server';

export const updateRooms = (roomsMap: Map<number, Room>) => {
  const data = Array.from(roomsMap).map((item) => {
    return {
      roomId: item[1].roomId,
      roomUsers: item[1].roomUsers.map((user: IUser) => {
        return {
          name: user.name,
          index: user.id,
        };
      }),
    };
  });

  const dataString = JSON.stringify(data);
  const jsonString = JSON.stringify({
    type: Commands.Update_room,
    data: dataString,
    id: 0,
  });

  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonString);
    }
  });
};
