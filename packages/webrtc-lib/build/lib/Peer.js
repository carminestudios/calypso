"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.Peer = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _BobPeerConnection = require("./BobPeerConnection");

// enum PEER_EVENT {
// 	/*
// 	 * The peer is trying to send a media stream to you. The event will carry a
// 	 * Promise as its data for you to resolve or reject depending if you want to
// 	 * accept the media stream or not.
// 	 */
// 	RECEIVE_MEDIASTREAM: 'RECEIVE_MEDIASTREAM';
// 	/*
// 	 * The peer sends a notification consisting of an event name together with
// 	 * any type of data, be it a literal, array or object.
// 	 */
// 	RECEIVE_NOTIFICATION: 'RECEIVE_NOTIFICATION';
// }

/*
 * Represents a connected peer.
 * You may message the peer or send your streams to it.
 * The peer also emits events when it is trying to message you or sent it's
 * streams to you.
 *
 * The peer emits events when it wants to communicate with you. For event
 * descriptions @see PEER_EVENT.
 */
var Peer
/* extends EventEmoitter */
=
/*#__PURE__*/
function () {
  function Peer(config, bobrtc, connectionOffer) {
    var _this = this;

    (0, _classCallCheck2["default"])(this, Peer);
    this.config = config;
    this.bobrtc = bobrtc; // Will be used to get the signaling handler

    this.id = config.id;
    this.name = null;
    this.availableStreams = config.streams; // Streams that the peer is capable of sending

    this.capabilities = {};
    var peerConnectionConfig = {
      onicecandidate: function onicecandidate(event) {
        console.log('Send ICE:', event);

        if (event.candidate) {
          _this.notify('ice', [event.candidate]);
        }
      },
      onoffer: function onoffer(offer) {
        console.log('Send Offer:', offer);

        _this.notify('offer', [offer]);
      },
      onanswer: function onanswer(answer) {
        console.log('Send Answer:', answer);

        _this.notify('answer', [answer]);
      },
      ondatachannel: function ondatachannel(datachannel) {
        console.log('Got Data Channel:', datachannel);
      }
    };
    var peerConnection = new _BobPeerConnection.BobPeerConnection(peerConnectionConfig, connectionOffer);
    this.peerConnection = peerConnection;
  }
  /*
   * Sends an event to the peer through the server.
   * This should be used to send application specific actions.
   * Should not be used to send chat messages!
   * The peer will receive the event by adding an event listener to the Peer
   * instance representing you.
   *
   * @param event The name of the event
   * @param data Whatever payload you want to sent to the peer
   */


  (0, _createClass2["default"])(Peer, [{
    key: "notify",
    value: function notify(method, params) {
      // Sends a message to the peer but through the connection server, no sensitive information should be passed through this method.
      var messageParams = [this.id, JSON.stringify({
        method: "peer:".concat(method),
        params: [this.bobrtc.me.id].concat(params)
      })];
      this.bobrtc.notify('message', messageParams);
    } // request(method, params) {
    // 	// Sends a message to the peer but through the connection server, no sensitive information should be passed through this method.
    // 	const messageData = {
    // 		peer: this.id,
    // 		method,
    // 		data,
    // 	};
    // 	return this.bobrtc.request(SERVER_METHODS.PEER_MESSAGE, messageData);
    // }

  }, {
    key: "sendTCPDataStream",
    value: function sendTCPDataStream(dataStream) {}
  }, {
    key: "sendUDPDataStream",
    value: function sendUDPDataStream(dataStream) {}
    /*
    * Starts streaming your media stream to the peer.
    * @param mediaStream Any type of WebRTC media stream (Video, Audio,
    * ScreenCapture, TabCapture)
     *
    * The peer will receive an event giving them the possibility to accept the
    * incoming stream. If they do accept the stream the returned promise will
    * resolve. If they decline the stream the promise will be rejected.
    */

  }, {
    key: "sendMediaStream",
    value: function sendMediaStream(mediaStream) {
      // Create RTCPeerConnection
      var bobPeerOutConnection = new BobPeerOutConnection(mediaStream);
      bobPeerOutConnection.getLocalDescription().then(function (localDescription) {
        // Send offer to peer
        request('offer', JSON.stringify({
          "sdp": desc
        })).then(function (remoteDescription) {
          bobPeerOutConnection.setRemoteDescription(remoteDescription);
        });
      });

      this._currentPeerConnections.push(bobPeerOutConnection);

      return Promise.resolve();
    }
    /*
    * Stops the transmission of the provided media stream to that specific peer.
    * @param mediaStream The stream you want to stop.
    */

  }, {
    key: "stopSendingMediaStream",
    value: function stopSendingMediaStream(mediaStream) {
      return Promise.resolve();
    }
  }]);
  return Peer;
}();

exports.Peer = Peer;
var _default = Peer;
exports["default"] = _default;