import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { User } from '../user';
import { Room } from '../room';
import { IUser } from '../interfaces/user';

export const server = createServer({});
const wss = new WebSocketServer({ server });

const users: IUser[] = [];
const rooms: Room[] = [];

const clients = new Map();

const updateRooms = () => {
  const data = rooms.map((item) => {
    return {
      roomId: item.roomId,
      roomUsers: item.roomUsers.map((user: IUser) => {
        return {
          name: user.name,
          index: user.id,
        };
      }),
    };
  });
  const dataString = JSON.stringify(data);
  const jsonString = JSON.stringify({
    type: 'update_room',
    data: dataString,
    id: 0,
  });

  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonString);
    }
  });
};

wss.on('connection', function connection(ws) {
  let connectionNumber = 0;

  ws.on('error', console.error);

  ws.on('message', function message(message) {
    const messageStr = message.toString();
    const messageObj = JSON.parse(messageStr);

    if (messageObj.type === 'reg') {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      const user = new User(dataObj.name, dataObj.password);
      users.push(user);

      connectionNumber = user.id;
      clients.set(connectionNumber, ws);

      const newData = {
        name: dataObj.name,
        index: dataObj.password,
        error: false,
        errorText: '',
      };

      const dataString = JSON.stringify(newData);
      const jsonString = JSON.stringify({
        type: 'reg',
        data: dataString,
        id: 0,
      });

      ws.send(jsonString);

      updateRooms();
    }

    if (messageObj.type === 'create_room') {
      const room = new Room();
      room.addUser(users[connectionNumber]);
      rooms.push(room);

      updateRooms();
    }

    if (messageObj.type === 'add_user_to_room') {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      if (rooms[dataObj.indexRoom].roomUsers.length < 2) {
        const roomUsers = rooms[dataObj.indexRoom].roomUsers;
        const existingUser = roomUsers.find((user) => user.id === users[connectionNumber].id);

        if (!existingUser) {
          rooms[dataObj.indexRoom].addUser(users[connectionNumber]);
        }
      }

      if (rooms[dataObj.indexRoom].roomUsers.length === 2) {
        const gameId = rooms[dataObj.indexRoom].createGame();

        rooms[dataObj.indexRoom].roomUsers.forEach((item) => {
          const roomdata = {
            idGame: gameId,
            idPlayer: item.id,
          };

          const dataString = JSON.stringify(roomdata);
          const jsonString = JSON.stringify({
            type: 'create_game',
            data: dataString,
            id: 0,
          });

          const client = clients.get(item.id);
          client.send(jsonString);
        });

        rooms.splice(dataObj.indexRoom, 1);
      }
    }
  });
});
