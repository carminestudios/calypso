
export const SIGNALING_EVENTS = {
	SIGNAL: 'signal',
};

/**
 * SignalingHandler relays information to and from the master server. Signaling
 * is just an implementation detail in BobRTC, ours use WebSockets but it can be
 * replaced with your own SignalingHandler that use two monkeys, two tin cans
 * and a string between them.
 *
 * @param url The url where the master server can be reached.
 * @param onSignal Function that will be called whenever we get a signal back
 * from the server.
 * @param onError Function that will be called whenever we get an error that the
 * signal handler could not handle by itself.
 */
export class SignalingHandler {
	constructor(url, onSignal, onError) {
		this.url = url;
		this.socket = null;
		this.onSignal = onSignal;
		this.onError = onError;

		this.socket = new WebSocket('wss://' + window.location.hostname + ':8443');
		this.socket.onmessage = (message) => {
			this.onSignal ? this.onSignal(JSON.parse(message.data)) : undefined;
		};
		this.socket.onerror = (error) => {
			this.onError ? this.onError(error) : undefined;
		};
	}

	joinRoom(roomId) {
		// this.socket = new WebSocket(url + '/' + roomId);
	}

	leaveRoom() {
		this.socket.close();
	}

	signal(method, params) {
		const messageObject = {
			method,
			params,
		};
		this.socket.send(JSON.stringify(messageObject));
	}

}

export default SignalingHandler;
