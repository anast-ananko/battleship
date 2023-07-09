import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { User } from '../user';
import { Room } from '../room';
import { BattleshipGame } from '../game';
import { IUser } from '../interfaces/user';
import { getKeyByValue } from '../utils/getKeyByValue';

export const server = createServer({});
const wss = new WebSocketServer({ server });

const clients = new Map();
const gameMap = new Map<number, BattleshipGame>();
const roomsMap = new Map<number, Room>();
const usersMap = new Map<number, User>();

const updateRooms = () => {
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
  let roomNumber = 0;

  ws.on('error', console.error);

  ws.on('message', function message(message) {
    const messageStr = message.toString();
    const messageObj = JSON.parse(messageStr);

    if (messageObj.type === 'reg') {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      let userExists = false;

      for (const user of usersMap.values()) {
        if (user.name === dataObj.name) {
          userExists = true;
        }
      }

      if (!userExists) {
        const user = new User(dataObj.name, dataObj.password);
        usersMap.set(user.id, user);

        connectionNumber = user.id;
        clients.set(connectionNumber, ws);
      }

      const newData = {
        name: dataObj.name,
        index: dataObj.password,
        error: userExists,
        errorText: userExists ? 'User with the same name already exists' : '',
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
      const user = usersMap.get(connectionNumber);
      if (user) room.addUser(user);
      roomNumber = room.roomId;
      roomsMap.set(roomNumber, room);

      updateRooms();
    }

    if (messageObj.type === 'add_user_to_room') {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      if (roomsMap.get(dataObj.indexRoom)!.roomUsers.length < 2) {
        const roomUsers = roomsMap.get(dataObj.indexRoom)!.roomUsers;
        const existingUser = roomUsers.find(
          (user) => user.id === usersMap.get(connectionNumber)?.id
        );

        if (!existingUser) {
          const user = usersMap.get(connectionNumber);
          if (user) roomsMap.get(dataObj.indexRoom)!.addUser(user);
        }
      }

      if (roomsMap.get(dataObj.indexRoom)!.roomUsers.length === 2) {
        const game = roomsMap.get(dataObj.indexRoom)!.createGame();
        gameMap.set(game.gameId, game);

        roomsMap.get(dataObj.indexRoom)!.roomUsers.forEach((item) => {
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
      }
    }

    if (messageObj.type === 'add_ships') {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      const room = roomsMap.get(dataObj.gameId);

      const game = gameMap.get(dataObj.gameId);
      game?.addShips(dataObj.indexPlayer, dataObj.ships);

      if (game?.shipsForPlayer.length === 2) {
        const game = gameMap.get(dataObj.gameId);
        game!.currentPlayer = dataObj.indexPlayer;

        const gameRoomId = room!.roomId;

        roomsMap.get(gameRoomId)!.roomUsers.forEach((item) => {
          const data = {
            currentPlayer: roomsMap.get(gameRoomId)!.roomUsers[0].id,
          };
          const dataString = JSON.stringify(data);
          const jsonStr = JSON.stringify({
            type: 'turn',
            data: dataString,
            id: 0,
          });

          if (item.id === game?.shipsForPlayer[0].playerIndex) {
            const data = {
              ships: game?.shipsForPlayer[0].ships,
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

          if (item.id === game?.shipsForPlayer[1].playerIndex) {
            const data = {
              ships: game?.shipsForPlayer[1].ships,
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
      game!.setCurrentPlayer(dataObj.indexPlayer);

      const room = roomsMap.get(dataObj.gameId);
      //const gameRoomId = room!.roomId;

      const status = game?.attack(dataObj.x, dataObj.y);

      const data = {
        position: { x: dataObj.x, y: dataObj.y },
        currentPlayer: game!.currentPlayer,
        status,
      };
      const attackString = JSON.stringify(data);
      const jsonAttackString = JSON.stringify({
        type: 'attack',
        data: attackString,
        id: 0,
      });

      const nextPlayer = roomsMap.get(room!.roomId)!.roomUsers.filter((item) => {
        return item.id !== game?.currentPlayer;
      });

      roomsMap.get(room!.roomId)!.roomUsers.forEach((item) => {
        const data = {
          currentPlayer: status === 'miss' ? nextPlayer[0].id : game!.currentPlayer,
        };
        const dataString = JSON.stringify(data);
        const jsonString = JSON.stringify({
          type: 'turn',
          data: dataString,
          id: 0,
        });

        const client = clients.get(item.id);
        client.send(jsonAttackString);
        client.send(jsonString);
      });
    }
  });

  ws.on('close', () => {
    const userId = getKeyByValue(clients, ws);

    for (const [roomId, room] of roomsMap) {
      room.roomUsers = room.roomUsers.filter((user) => user.id !== userId);
      if (room.roomUsers.length === 0) {
        roomsMap.delete(roomId);
      }
    }
    usersMap.delete(userId);
    updateRooms();
  });
});
