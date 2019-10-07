const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const fs = require('fs');
const https = require('https');
const uniqueId = require('./unique-id');

const HTTPS_PORT = 8443;

// Yes, SSL is required
const httpsServer = https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
}, () => {

});
httpsServer.listen(HTTPS_PORT, '0.0.0.0');

/**
 * A client connected to the SignalingServer
 */
class SignalingClient {
	constructor(websocket, onClientMessage, onBroadcast) {
		this.id = uniqueId();
    this.websocket = websocket;
    this.onClientMessage = onClientMessage;
    this.onBroadcast = onBroadcast;
    
    this.websocket.on('message', (messageString) => {
      try {
        const data = JSON.parse(messageString);

        switch (data.method) {
          case 'message':
            // TODO: Validate args
            const clientId = data.params[0];
            const clientMessage = data.params[1];
            this.onClientMessage(clientId, clientMessage);
            break;
          case 'broadcast':
            // TODO: Validate args
            const broadcastMessage = data.params[0];
            this.onBroadcast(broadcastMessage);
            break;
          default:
            // Handle errors
            console.log('No such method: ', data.method);
        }

        console.log('received: ', data);
        console.log(typeof data);
      } catch (err) {
        // Error handling
        console.log('error receiving message: ', message, err);
      }
    });
  }
  
	message(message) {
		this.websocket.send(message);
	}
}


class SignalingServer {
  constructor (httpsServer) {
    this.httpsServer = httpsServer;
    this.wss = new WebSocketServer({server: this.httpsServer});

    this.clients = {};

    this.methods = {
      'message': (clientId, message) => {
        const client = clients[clientId];
        if (client && client.websocket.readyState === WebSocket.OPEN) {
          client.message(message);
        } else {
          // Error handling
        }
      },
      'broadcast': (message) => {
        Object.values(clients).forEach((client) => {
          if(client.websocket.readyState === WebSocket.OPEN) {
            client.message(message);
          }
        });
      },
    };

  }

  setupSocketServer () {
    // Create a server for handling websocket calls
    wss.on('connection', function(ws) {
      const client = new SignalingClient(ws);

      ws.onclose = () => {
        removeClient(client);
      };

      addClient(client);
    });

    wss.broadcast = function(data) {
      console.log('Broadcasting: ' + JSON.stringify(data));
      Object.values(clients).forEach((client) => {
        if(client.websocket.readyState === WebSocket.OPEN) {
          client.websocket.send(data);
        }
      });
    };
  }

  numberOfClients () {
    return Object.keys(this.clients).length;
  }
  
  addClient (client) {
    this.clients[client.id] = client;
    console.log(`Client ${client.id} connected!`);
    console.log(`Total number of clients: ${this.numberOfClients()}`);
  
    // Tell the client its own ID
    client.message(JSON.stringify({
      method: 'me',
      params: [{
        id: client.id,
      }],
    }));
  
    // Tell the client about all other peers
    const clientIds = Object.values(this.clients).map(client => ({id:client.id}));
    client.message(JSON.stringify({
      method: 'peers',
      params: [clientIds],
    }));
  };

  removeClient (client) {
    delete this.clients[client.id];
    console.log('Client "' + client.id + '" disconnected :(');
    console.log('Total number of clients: ' + this.numberOfClients());
  };
}

const signalingServer = new SignalingServer(httpsServer);

console.log(`Server running. Visit https://localhost:${HTTPS_PORT} in Firefox/Chrome (note the HTTPS; there is no HTTP -> HTTPS redirect!)`);
