"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.SignalingHandler = exports.SIGNALING_EVENTS = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var SIGNALING_EVENTS = {
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

exports.SIGNALING_EVENTS = SIGNALING_EVENTS;

var SignalingHandler =
/*#__PURE__*/
function () {
  function SignalingHandler(url, onSignal, onError) {
    (0, _classCallCheck2["default"])(this, SignalingHandler);
    this.url = url;
    this.socket = null;
    this.onSignal = onSignal;
    this.onError = onError;
  }

  (0, _createClass2["default"])(SignalingHandler, [{
    key: "connect",
    value: function connect() {
      var _this = this;

      this.socket = new WebSocket(this.url);

      this.socket.onmessage = function (message) {
        _this.onSignal ? _this.onSignal(JSON.parse(message.data)) : undefined;
      };

      this.socket.onerror = function (error) {
        _this.onError ? _this.onError(error) : undefined;
      };
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

exports.SignalingHandler = SignalingHandler;
var _default = SignalingHandler;
exports["default"] = _default;