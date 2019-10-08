import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
export var SIGNALING_EVENTS = {
  SIGNAL: 'signal'
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

export var SignalingHandler =
/*#__PURE__*/
function () {
  function SignalingHandler(url) {
    _classCallCheck(this, SignalingHandler);

    this.url = url;
    this.socket = null;
    this.listeners = {
      open: [],
      message: [],
      error: []
    };
  }

  _createClass(SignalingHandler, [{
    key: "connect",
    value: function connect() {
      var _this = this;

      this.socket = new WebSocket(this.url);

      this.socket.onopen = function () {
        return _this.onopen.apply(_this, arguments);
      };

      this.socket.onmessage = function () {
        return _this.onmessage.apply(_this, arguments);
      };

      this.socket.onerror = function () {
        return _this.onerror.apply(_this, arguments);
      };

      return Promise.resolve(function (resolve) {
        _this.on('open', resolve(_this));
      });
    }
  }, {
    key: "onopen",
    value: function onopen() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      this.listeners.open.forEach(function (listener) {
        return listener.apply(void 0, args);
      });
    }
  }, {
    key: "onmessage",
    value: function onmessage(message) {
      var data = JSON.parse(message.data);
      this.listeners.message.forEach(function (listener) {
        return listener(data);
      });
    }
  }, {
    key: "onerror",
    value: function onerror() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      this.listeners.error.forEach(function (listener) {
        return listener.apply(void 0, args);
      });
    }
  }, {
    key: "on",
    value: function on(eventName, callback) {
      this.listeners[eventName.toLowerCase()].push(callback);
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      this.socket.close();
    }
  }, {
    key: "joinRoom",
    value: function joinRoom() {}
  }, {
    key: "leaveRoom",
    value: function leaveRoom() {}
  }, {
    key: "signal",
    value: function signal(method, params) {
      var messageObject = {
        method: method,
        params: params
      };
      this.socket.send(JSON.stringify(messageObject));
    }
  }]);

  return SignalingHandler;
}();