import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { User } from '../user';
import { Room } from '../room';
import { BattleshipGame } from '../game';
import { IUser } from '../interfaces/user';

export const server = createServer({});
const wss = new WebSocketServer({ server });

const users: User[] = [];
const rooms: Room[] = [];

const clients = new Map();
const gameMap = new Map<number, BattleshipGame>();

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
        const game = rooms[dataObj.indexRoom].createGame();
        gameMap.set(game.gameId, game);

        rooms[dataObj.indexRoom].roomUsers.forEach((item) => {
          const roomdata = {
            idGame: game.gameId,
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

        //rooms.splice(dataObj.indexRoom, 1);
      }
    }

    if (messageObj.type === 'add_ships') {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      const room = rooms.filter((item) => item.game?.gameId === dataObj.gameId);
      room[0].addShips(dataObj.indexPlayer, dataObj.ships);

      if (room[0].shipsForPlayer.length === 2) {
        const game = gameMap.get(dataObj.gameId);
        game!.currentPlayer = dataObj.indexPlayer;

        const gameRoomId = room[0].roomId;

        rooms[gameRoomId].roomUsers.forEach((item) => {
          const data = {
            currentPlayer: rooms[gameRoomId].roomUsers[0].id,
          };
          const dataString = JSON.stringify(data);
          const jsonStr = JSON.stringify({
            type: 'turn',
            data: dataString,
            id: 0,
          });

          if (item.id === room[0].shipsForPlayer[0].playerIndex) {
            const data = {
              ships: room[0].shipsForPlayer[item.id],
              currentPlayerIndex: item.id,
            };
            const dataString = JSON.stringify(data);
            const jsonString = JSON.stringify({
              type: 'start_game',
              data: dataString,
              id: 0,
            });

            const client = clients.get(item.id);
            client.send(jsonString);
            client.send(jsonStr);
          }

          if (item.id === room[0].shipsForPlayer[1].playerIndex) {
            const data = {
              ships: room[0].shipsForPlayer[item.id].ships,
              currentPlayerIndex: item.id,
            };
            const dataString = JSON.stringify(data);
            const jsonString = JSON.stringify({
              type: 'start_game',
              data: dataString,
              id: 0,
            });

            const client = clients.get(item.id);
            client.send(jsonString);
            client.send(jsonStr);
          }
        });
      }
    }

    if (messageObj.type === 'attack') {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      const game = gameMap.get(dataObj.gameId);
      game!.currentPlayer = dataObj.indexPlayer;

      const room = rooms.filter((item) => item.game?.gameId === dataObj.gameId);
      const gameRoomId = room[0].roomId;

      const nextPlayer = rooms[gameRoomId].roomUsers.filter((item) => {
        return item.id !== game?.currentPlayer;
      });

      rooms[gameRoomId].roomUsers.forEach((item) => {
        const data = {
          currentPlayer: nextPlayer[0].id,
        };
        const dataString = JSON.stringify(data);
        const jsonString = JSON.stringify({
          type: 'turn',
          data: dataString,
          id: 0,
        });

        const client = clients.get(item.id);
        client.send(jsonString);
      });
    }
  });
});
