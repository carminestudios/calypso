
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;


const clients = {};

let counter = 0;
const uniqueId = () => {
	const id = 'BobRTCWebSocketClient_' + counter;
	counter++;
	return id;
};

class SocketClient {
	constructor(websocket) {
		this.id = uniqueId();
		this.websocket = websocket;
	}

	message(message) {
		this.websocket.send(message);
	}
}

const numberOfClients = () => {
	return Object.keys(clients).length;
};

const addClient = (client) => {
	clients[client.id] = client;
	console.log('Client "' + client.id + '" connected :D');
	console.log('Total number of clients: ' + numberOfClients());

	// Tell the client its own ID
	client.message(JSON.stringify({
		method: 'me',
		params: [{
			id: client.id,
		}],
	}));


	// Tell the client about all other peers
	const clientIds = Object.values(clients).map(client => ({id:client.id}));
	client.message(JSON.stringify({
		method: 'peers',
		params: [clientIds],
	}));

};

const removeClient = (client) => {
	delete clients[client.id];
	console.log('Client "' + client.id + '" disconnected :(');
	console.log('Total number of clients: ' + numberOfClients());
};


const methods = {
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

const signaling = (httpsServer) => {
	// Create a server for handling websocket calls
	var wss = new WebSocketServer({server: httpsServer});

	wss.on('connection', function(ws) {

		const client = new SocketClient(ws);

		ws.on('message', function(message) {
			try {
				const data = JSON.parse(message);
				const methodImpl = methods[data.method];

				if (methodImpl) {
					methodImpl.apply(null, data.params);
				} else {
					console.log('No such method found: ', data.method)
				}


				console.log('received: ', data);
				console.log(typeof data);
			} catch (err) {
				// Error handling
				console.log('error receiving message: ', message, err);
			}
		});

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

};


module.exports = signaling;
