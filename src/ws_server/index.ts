import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { User } from '../user';
import { Room } from '../room';
import { BattleshipGame } from '../game';
import { IUser } from '../interfaces/user';
import { IWinner } from '../interfaces/winner';
import { getKeyByValue } from '../utils/getKeyByValue';

export const server = createServer({});
const wss = new WebSocketServer({ server });

const clients = new Map();
const gameMap = new Map<number, BattleshipGame>();
const roomsMap = new Map<number, Room>();
const usersMap = new Map<number, User>();
const winnersMap = new Map<number, IWinner>();

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

const updateWinners = () => {
  const data = [];
  for (const winner of winnersMap.values()) {
    data.push({ name: winner.winner.name, wins: winner.wins });
  }

  const dataString = JSON.stringify(data);
  const jsonString = JSON.stringify({
    type: 'update_winners',
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
        winnersMap.set(user.id, { winner: user, wins: 0 });

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
      updateWinners();
    }

    if (messageObj.type === 'create_room') {
      const room = new Room();
      const user = usersMap.get(connectionNumber);
      if (user) room.addUser(user);
      roomNumber = room.roomId;
      roomsMap.set(roomNumber, room);

      updateRooms();
      updateWinners();
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

      if (game?.currentPlayer === dataObj.indexPlayer) {
        const room = roomsMap.get(dataObj.gameId);

        const result = game?.attack(dataObj.x, dataObj.y);

        if (result !== 'Already attacked') {
          const data = {
            position: { x: dataObj.x, y: dataObj.y },
            currentPlayer: game!.currentPlayer,
            status: result,
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
              currentPlayer: result === 'miss' ? nextPlayer[0].id : game!.currentPlayer,
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

          const player = result === 'miss' ? nextPlayer[0].id : game!.currentPlayer;
          game!.setCurrentPlayer(player!);
        }

        if (game?.isFinish) {
          const winner = usersMap.get(game!.winner!);

          const numberWins = winnersMap.get(winner!.id)?.wins;
          winnersMap.set(winner!.id, { winner: winner!, wins: numberWins! + 1 });

          const data = {
            winPlayer: winner?.id,
          };

          const dataString = JSON.stringify(data);
          const jsonString = JSON.stringify({
            type: 'finish',
            data: dataString,
            id: 0,
          });

          roomsMap.get(room!.roomId)!.roomUsers.forEach((item) => {
            const client = clients.get(item.id);
            client.send(jsonString);
          });

          roomsMap.delete(room!.roomId);
          updateWinners();
          updateRooms();
        }
      }
    }

    if (messageObj.type === 'randomAttack') {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      const game = gameMap.get(dataObj.gameId);

      if (game?.currentPlayer === dataObj.indexPlayer) {
        const room = roomsMap.get(dataObj.gameId);

        const result = game?.randomAttack(dataObj.indexPlayer);

        if (result!.status !== 'Already attacked') {
          const data = {
            position: { x: result!.x, y: result!.y },
            currentPlayer: game!.currentPlayer,
            status: result!.status,
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
              currentPlayer: result!.status === 'miss' ? nextPlayer[0].id : game!.currentPlayer,
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

          const player = result?.status === 'miss' ? nextPlayer[0].id : game!.currentPlayer;
          game!.setCurrentPlayer(player!);
        }
      }
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
    winnersMap.delete(userId);
    clients.delete(userId);

    updateRooms();
    updateWinners();
  });
});
