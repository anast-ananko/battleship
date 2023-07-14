import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { User } from '../user';
import { Room } from '../room';
import { BattleshipGame } from '../game';
import { IWinner } from '../interfaces/winner';
import { Commands } from '../interfaces/server';
import { getKeyByValue } from '../utils/getKeyByValue';
import { updateRooms } from '../utils/updateRooms';
import { updateWinners } from '../utils/updateWinners';
import { findRoomIdByUserId } from '../utils/findRoomByUserId';
import { findRoomIdByGameId } from '../utils/findRoomByGameId';

export const server = createServer({});
export const wss = new WebSocketServer({ server });

const clientsMap = new Map();
const gamesMap = new Map<number, BattleshipGame>();
const roomsMap = new Map<number, Room>();
const usersMap = new Map<number, User>();
const winnersMap = new Map<number, IWinner>();

wss.on('connection', function connection(ws) {
  let connectionNumber = 0;
  let roomNumber = 0;

  ws.on('error', console.error);

  ws.on('message', function message(message) {
    const messageStr = message.toString();
    const messageObj = JSON.parse(messageStr);

    if (messageObj.type === Commands.Reg) {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      let userExists = false;
      let isError = false;
      let errorMessage = '';
      let currentUser;

      for (const user of usersMap.values()) {
        if (user.name === dataObj.name) {
          userExists = true;
          currentUser = user;

          if (user.password !== dataObj.password) {
            errorMessage = 'Invalid password';

            isError = true;
          }
        }
      }

      if (!userExists) {
        currentUser = new User(dataObj.name, dataObj.password);
        usersMap.set(currentUser.id, currentUser);
        winnersMap.set(currentUser.id, { winner: currentUser, wins: 0 });
      }

      clientsMap.set(currentUser?.id, ws);

      if (currentUser) {
        connectionNumber = currentUser.id;
      }

      const newData = {
        name: dataObj.name,
        index: dataObj.password,
        error: isError,
        errorText: errorMessage,
      };

      const dataString = JSON.stringify(newData);
      const jsonString = JSON.stringify({
        type: Commands.Reg,
        data: dataString,
        id: 0,
      });

      ws.send(jsonString);

      updateRooms(roomsMap);
      updateWinners(winnersMap);
    }

    if (messageObj.type === Commands.Create_room) {
      const room = new Room();
      const user = usersMap.get(connectionNumber);
      if (user) room.addUser(user);
      roomNumber = room.roomId;
      roomsMap.set(roomNumber, room);

      updateRooms(roomsMap);
      updateWinners(winnersMap);
    }

    if (messageObj.type === Commands.Add_user_to_room) {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      const gameRoom = roomsMap.get(dataObj.indexRoom);

      if (gameRoom) {
        if (gameRoom.roomUsers.length < 2) {
          const existingUser = gameRoom.roomUsers.find(
            (user) => user.id === usersMap.get(connectionNumber)?.id
          );

          if (!existingUser) {
            const user = usersMap.get(connectionNumber);
            if (user) gameRoom.addUser(user);
          }
        }

        if (gameRoom.roomUsers.length === 2) {
          const game = gameRoom.createGame();

          gamesMap.set(game.gameId, game);

          const room = roomsMap.get(dataObj.indexRoom);

          if (room) {
            room.roomUsers.forEach((item) => {
              const roomdata = {
                idGame: game.gameId,
                idPlayer: item.id,
              };

              const dataString = JSON.stringify(roomdata);
              const jsonString = JSON.stringify({
                type: Commands.Create_game,
                data: dataString,
                id: 0,
              });

              const client = clientsMap.get(item.id);
              client.send(jsonString);
            });
          }
        }
      }
    }

    if (messageObj.type === Commands.Add_ships) {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      const roomNumber = findRoomIdByGameId(dataObj.gameId, roomsMap);

      const gameRoom = roomsMap.get(roomNumber!);

      const game = gamesMap.get(dataObj.gameId);
      game?.addShips(dataObj.indexPlayer, dataObj.ships);

      if (game?.shipsForPlayer.length === 2) {
        if (game) game.currentPlayer = dataObj.indexPlayer;

        if (gameRoom) {
          gameRoom.roomUsers.forEach((item) => {
            const data = {
              currentPlayer: gameRoom.roomUsers[0].id,
            };

            const dataString = JSON.stringify(data);
            const jsonStr = JSON.stringify({
              type: Commands.Turn,
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
                type: Commands.Start_game,
                data: dataString,
                id: 0,
              });

              const client = clientsMap.get(item.id);
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
                type: Commands.Start_game,
                data: dataString,
                id: 0,
              });

              const client = clientsMap.get(item.id);
              client.send(jsonString);
              client.send(jsonStr);
            }
          });
        }
      }
    }

    if (messageObj.type === Commands.Attack) {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      const game = gamesMap.get(dataObj.gameId);

      if (game?.currentPlayer === dataObj.indexPlayer) {
        const roomNumber = findRoomIdByGameId(dataObj.gameId, roomsMap);

        const gameRoom = roomsMap.get(roomNumber!);

        const result = game?.attack(dataObj.x, dataObj.y);

        if (gameRoom) {
          const nextPlayer = gameRoom.roomUsers.filter((item) => {
            return item.id !== game?.currentPlayer;
          });

          if (result !== 'Already attacked') {
            if (game) {
              const data = {
                position: { x: dataObj.x, y: dataObj.y },
                currentPlayer: game.currentPlayer,
                status: result,
              };

              const attackString = JSON.stringify(data);
              const jsonAttackString = JSON.stringify({
                type: Commands.Attack,
                data: attackString,
                id: 0,
              });

              gameRoom.roomUsers.forEach((item) => {
                const client = clientsMap.get(item.id);
                client.send(jsonAttackString);
              });
            }

            gameRoom.roomUsers.forEach((item) => {
              if (game) {
                const data = {
                  currentPlayer: result === 'miss' ? nextPlayer[0].id : game.currentPlayer,
                };

                const dataString = JSON.stringify(data);
                const jsonString = JSON.stringify({
                  type: Commands.Turn,
                  data: dataString,
                  id: 0,
                });

                const client = clientsMap.get(item.id);
                client.send(jsonString);
              }
            });

            if (game) {
              const player = result === 'miss' ? nextPlayer[0].id : game.currentPlayer;
              if (player !== null) game.setCurrentPlayer(player);
            }
          } else {
            gameRoom.roomUsers.forEach((item) => {
              if (game) {
                const data = {
                  currentPlayer: game.currentPlayer,
                };

                const dataString = JSON.stringify(data);
                const jsonString = JSON.stringify({
                  type: Commands.Turn,
                  data: dataString,
                  id: 0,
                });

                const client = clientsMap.get(item.id);
                client.send(jsonString);
              }
            });

            if (game) {
              const player = game.currentPlayer;
              if (player !== null) game.setCurrentPlayer(player);
            }
          }
        }

        if (result === 'killed') {
          const coords = game?.getSurroundingCoordinates(dataObj.x, dataObj.y);

          let surroundingCoordinates: { x: number; y: number }[];
          let killedCoordinates: { x: number; y: number }[];

          if (coords) {
            ({ surroundingCoordinates, killedCoordinates } = coords);
          }

          if (gameRoom) {
            gameRoom.roomUsers.forEach((item) => {
              surroundingCoordinates.forEach((coord) => {
                if (game) {
                  const data = {
                    position: { x: coord.x, y: coord.y },
                    currentPlayer: game.currentPlayer,
                    status: 'miss',
                  };

                  const dataString = JSON.stringify(data);
                  const jsonString = JSON.stringify({
                    type: Commands.Attack,
                    data: dataString,
                    id: 0,
                  });

                  const client = clientsMap.get(item.id);
                  client.send(jsonString);
                }
              });
            });

            gameRoom.roomUsers.forEach((item) => {
              killedCoordinates.forEach((coord) => {
                if (game) {
                  const data = {
                    position: { x: coord.x, y: coord.y },
                    currentPlayer: game.currentPlayer,
                    status: 'killed',
                  };

                  const dataString = JSON.stringify(data);
                  const jsonString = JSON.stringify({
                    type: Commands.Attack,
                    data: dataString,
                    id: 0,
                  });

                  const client = clientsMap.get(item.id);
                  client.send(jsonString);
                }
              });
            });
          }
        }

        if (game) {
          if (game.isFinish) {
            const gameWinner = game.winner;

            let winner;
            if (gameWinner !== null) winner = usersMap.get(gameWinner);

            if (winner) {
              const numberWins = winnersMap.get(winner.id)?.wins;

              if (numberWins !== undefined)
                winnersMap.set(winner.id, { winner: winner, wins: numberWins + 1 });

              const data = {
                winPlayer: winner.id,
              };

              const dataString = JSON.stringify(data);
              const jsonString = JSON.stringify({
                type: Commands.Finish,
                data: dataString,
                id: 0,
              });

              if (gameRoom) {
                gameRoom.roomUsers.forEach((item) => {
                  const client = clientsMap.get(item.id);
                  client.send(jsonString);
                });

                roomsMap.delete(gameRoom.roomId);
                updateWinners(winnersMap);
                updateRooms(roomsMap);
              }
            }

            gamesMap.delete(game.gameId);
          }
        }
      }
    }

    if (messageObj.type === Commands.RandomAttack) {
      const dataStr = messageObj.data.toString();
      const dataObj = JSON.parse(dataStr);

      const game = gamesMap.get(dataObj.gameId);

      if (game) {
        if (game.currentPlayer === dataObj.indexPlayer) {
          const roomNumber = findRoomIdByGameId(dataObj.gameId, roomsMap);

          const room = roomsMap.get(roomNumber!);

          const result = game.randomAttack(dataObj.indexPlayer);

          if (result) {
            if (result.status !== 'Already attacked') {
              const data = {
                position: { x: result.x, y: result.y },
                currentPlayer: game.currentPlayer,

                status: result.status,
              };
              const attackString = JSON.stringify(data);
              const jsonAttackString = JSON.stringify({
                type: Commands.Attack,
                data: attackString,
                id: 0,
              });

              let gameRoom;
              if (room) gameRoom = roomsMap.get(room.roomId);

              if (gameRoom) {
                const nextPlayer = gameRoom.roomUsers.filter((item) => {
                  return item.id !== game.currentPlayer;
                });

                gameRoom.roomUsers.forEach((item) => {
                  const data = {
                    currentPlayer: result.status === 'miss' ? nextPlayer[0].id : game.currentPlayer,
                  };
                  const dataString = JSON.stringify(data);
                  const jsonString = JSON.stringify({
                    type: Commands.Turn,
                    data: dataString,
                    id: 0,
                  });

                  const client = clientsMap.get(item.id);
                  client.send(jsonAttackString);
                  client.send(jsonString);
                });

                const player = result.status === 'miss' ? nextPlayer[0].id : game.currentPlayer;

                if (player !== null) game.setCurrentPlayer(player);
              }
            }
          } else {
            room!.roomUsers.forEach((item) => {
              if (game) {
                const data = {
                  currentPlayer: game.currentPlayer,
                };

                const dataString = JSON.stringify(data);
                const jsonString = JSON.stringify({
                  type: Commands.Turn,
                  data: dataString,
                  id: 0,
                });

                const client = clientsMap.get(item.id);
                client.send(jsonString);
              }
            });

            if (game) {
              const player = game.currentPlayer;
              if (player !== null) game.setCurrentPlayer(player);
            }
          }
        }
      }
    }
  });

  ws.on('close', () => {
    const userId = getKeyByValue(clientsMap, ws);

    const roomId = findRoomIdByUserId(userId, roomsMap);

    let room;
    if (roomId !== undefined) room = roomsMap.get(roomId);

    const winner = room?.roomUsers.find((item) => item.id !== userId);

    if (room?.game) {
      if (winner) {
        const numberWins = winnersMap.get(winner.id)?.wins;

        if (numberWins !== undefined)
          winnersMap.set(winner.id, { winner: winner, wins: numberWins + 1 });

        const data = {
          winPlayer: winner?.id,
        };

        const dataString = JSON.stringify(data);
        const jsonString = JSON.stringify({
          type: Commands.Finish,
          data: dataString,
          id: 0,
        });

        room.roomUsers.forEach((item) => {
          const client = clientsMap.get(item.id);
          client.send(jsonString);
        });
      }

      if (roomId !== undefined) {
        roomsMap.delete(roomId);
      }
    }

    for (const [roomId, room] of roomsMap) {
      room.roomUsers = room.roomUsers.filter((user) => user.id !== userId);
      if (room.roomUsers.length === 0) {
        roomsMap.delete(roomId);
      }
    }

    clientsMap.delete(userId);

    updateRooms(roomsMap);
    updateWinners(winnersMap);
  });
});
