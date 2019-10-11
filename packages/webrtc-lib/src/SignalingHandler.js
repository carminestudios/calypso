/**
 * A SignalingHandler relays information to and from the master server. Signaling
 * is just an implementation detail in BobRTC, ours use WebSockets but it can be
 * replaced with your own SignalingHandler that use two monkeys, two tin cans
 * and a string between them.
 *
 * @param url The url where the master server can be reached.
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
    this.socket.onopen = (...args) => this._onopen(...args);
    this.socket.onmessage = (...args) => this._onmessage(...args);
    this.socket.onerror = (...args) => this._onerror(...args);

    return Promise.resolve((resolve) => {
      this.on('open', resolve(this));
    });
  }

  _onopen(...args) {
    this.listeners.open.forEach((listener) => listener(...args));
  }

  _onmessage(message) {
    const data = JSON.parse(message.data);
    this.listeners.message.forEach((listener) => listener(data));
  }

  _onerror(...args) {
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
