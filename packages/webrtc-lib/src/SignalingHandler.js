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
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.listeners = {
      open: [],
      message: [],
      error: [],
    };
  }

  connect() {
    this.socket = new WebSocket(this.url);
    this.socket.onopen = (...args) => this.onopen(...args);
    this.socket.onmessage = (...args) => this.onmessage(...args);
    this.socket.onerror = (...args) => this.onerror(...args);

    return Promise.resolve((resolve) => {
      this.on('open', resolve(this));
    });
  }

  onopen(...args) {
    this.listeners.open.forEach((listener) => listener(...args));
  }

  onmessage(message) {
    const data = JSON.parse(message.data);
    this.listeners.message.forEach((listener) => listener(data));
  }

  onerror(...args) {
    this.listeners.error.forEach((listener) => listener(...args));
  }

  on(eventName, callback) {
    this.listeners[eventName.toLowerCase()].push(callback);
  }

  disconnect() {
    this.socket.close();
  }

  joinRoom() {}

  leaveRoom() {}

  signal(method, params) {
    const messageObject = {
      method,
      params,
    };
    this.socket.send(JSON.stringify(messageObject));
  }
}
