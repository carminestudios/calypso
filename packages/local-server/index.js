const onConnect = require('@carminestudios/calypso-fn-onconnect');
const onDisconnect = require('@carminestudios/calypso-fn-ondisconnect');

// eslint-disable-next-line import/no-extraneous-dependencies
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const https = require('https');

const HTTPS_PORT = 8443;

// Yes, SSL is required
const server = https.createServer(
  {
    key: fs.readFileSync(path.resolve(__dirname, 'local-key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, 'local-cert.pem')),
  },
  () => {},
);
//server.listen(HTTPS_PORT, '0.0.0.0');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', async (wsClient) => {
  const connection = await onConnect(null, { wsClient });
  console.log('connected', connection);

  wsClient.onclose = () => {
    onDisconnect(wsClient, connection.id);
  };
});
