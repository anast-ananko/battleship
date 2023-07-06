import { createServer } from 'http';
import { WebSocketServer } from 'ws';

export const server = createServer({});
const wss = new WebSocketServer({ server });

interface IData<T> {
  type: string;
  data: T;
  id: number;
}

interface IRegFromFront {
  name: string;
  password: string;
}

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    const messageStr = data.toString();
    const messageObj = JSON.parse(messageStr);

    if (messageObj.type === 'reg') {
      const userStr = messageObj.data.toString();
      const userObj: IRegFromFront = JSON.parse(userStr);

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
    }

    if (messageObj.type === 'create_room') {
      //ws.send(jsonString);
    }

    //console.log('received: %s', messageObj);
  });
});
