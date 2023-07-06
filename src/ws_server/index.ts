import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { User } from '../user';
import { IUser, Room } from '../room';

export const server = createServer({});
const wss = new WebSocketServer({ server });

// interface IData<T> {
//   type: string;
//   data: T;
//   id: number;
// }

interface IRegFromFront {
  name: string;
  password: string;
}

interface IRoomData {
  indexRoom: number;
}

interface IRoom {
  roomId: number;
  roomUsers: IUser[];
}

const users: IUser[] = [];
const rooms: Room[] = [];

const updateRooms = () => {
  const data = rooms.map((item: IRoom) => {
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
  let num = 0;
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    const messageStr = data.toString();
    const messageObj = JSON.parse(messageStr);

    if (messageObj.type === 'reg') {
      const userStr = messageObj.data.toString();
      const userObj: IRegFromFront = JSON.parse(userStr);

      const user = new User(userObj.name, userObj.password);
      num = user.id;
      users.push(user);

      const userData = {
        name: userObj.name,
        index: userObj.password,
        error: false,
        errorText: '',
      };
      const dataString = JSON.stringify(userData);
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

      room.addUser(users[num]);
      rooms.push(room);
      updateRooms();
    }

    if (messageObj.type === 'add_user_to_room') {
      const roomStr = data.toString();
      const roomObj = JSON.parse(roomStr);
      console.log(roomObj.data);

      // const dataStr = roomObj.data.toString();
      // const dataObj: number = JSON.parse(dataStr);
      // rooms[dataObj].addUser(users[num]);
      // console.log(dataObj);
      //updateRooms();
      // if (rooms[dataObj.indexRoom].roomUsers.length === 2) {
      //   const roomdata = {
      //     idGame: rooms[dataObj.indexRoom].game,
      //     idPlayer: users[1],
      //   };
      //   const dataString = JSON.stringify(roomdata);
      //   const jsonString = JSON.stringify({
      //     type: 'create_game',
      //     data: dataString,
      //     id: 0,
      //   });
      //   ws.send(jsonString);
      // }
    }
  });
});

//const data = [{ roomId: rooms[0].roomId, roomUsers: rooms[0].roomUsers }];
// const data = {
//   rooms: rooms.map((item: IRoom) => {
//     return {
//       roomId: item.roomId,
//       roomUsers: JSON.stringify(item.roomUsers),
//     };
//   }),
// };
