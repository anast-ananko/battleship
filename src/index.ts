import { httpServer } from './http_server/index';

import { server as wsServer } from './ws_server/index';

const HTTP_PORT = 8181;
const WS_PORT = process.env.WS_PORT || 3000;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

console.log(`Start WebSocket server on port ${WS_PORT}!`);

wsServer.listen(WS_PORT);
