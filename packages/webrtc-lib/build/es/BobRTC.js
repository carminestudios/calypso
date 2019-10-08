import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import uuid from 'uuid';
import { SignalingHandler, SIGNALING_EVENTS } from './SignalingHandler';
import MessageQueue from './MessageQueue';
import { Peer } from './Peer'; // enum SERVER_METHODS {
// 	PEER_MESSAGE: 'peerMessage';
// }

export function generateRequestId() {
  return uuid();
}
/*
 * BobRTC makes it easy for you to build Web Real Time Communication applications.
 * Bob abstracts away all of the hard parts where you have to exchange
 * configuration parameters and use your own signaling server (you can specify
 * your own though).
 *
 * Bob connects you to a virtual room together with other peers which you can choose to
 * send your media streams or pure data streams to. All communication sent using
 * the Peer object is completely P2P and will never ever end up on our servers.
 * You and your activities are anonymous to us.



 Overview

 # Server
 Just handles simple connection info between clients.

 # Client/Peer
 Connects to the server to broadcast its presense and get info about other
 clients. All other information are sent directly peer to peer and will
 never end up on the server itself.

 * Peer to peer data connection
 The end goal for the communication with the server is to setup a peer to peer
 data connection between all peers in the joined room on the server. This
 channel is then used for creating and negotiating more WebRTC channels with
 media streams, file streams etc.

 * Peer to peer

 */

export var BobRTC
/* extends EventEmitter */
=
/*#__PURE__*/
function () {
  function BobRTC(masterServerURL, signalingHandler) {
    var _this = this;

    _classCallCheck(this, BobRTC);

    this.masterServerURL = masterServerURL;
    this.peers = [];
    this.me = {
      id: null,
      name: null
    };
    this.roomConfig = null; //this.messageQueue = new MessageQueue();

    this.signalingHandler = signalingHandler ? signalingHandler : new SignalingHandler(masterServerURL);

    this.signalingHandler.onSignal = function (data) {
      // Wisper message
      try {
        var method = data.method;
        var params = data.params;

        _this._signalingMethods[method].apply(null, params);
      } catch (err) {
        console.log(err);
      } // Server says!
      //console.log('Server says: ' + JSON.stringify(data));

    };

    this._signalingMethods = {
      me: function me(info) {
        _this.me.id = info.id;
        console.log('My server assigned id is: ', _this.me.id);
      },
      // All peers connected to the server at the moment
      peers: function peers(_peers) {
        var filteredPeers = _peers.filter(function (peer) {
          return peer.id !== _this.me.id;
        });

        for (var i = 0; i < filteredPeers.length; i++) {
          var peerInfo = filteredPeers[i];
          var config = {
            id: peerInfo.id
          };
          var signalPeer = new Peer(config, _this);

          _this.peers.push(signalPeer);
        }

        console.log('Got list of peers: ', _peers);
      },
      // Updated peer
      'peer:update': function peerUpdate(peerId, params) {},
      // // Disconnected peer
      // 'peer:~': (peerId) => {
      //
      // },
      // Peer Offer
      'peer:offer': function peerOffer(peerId, offer) {
        console.log('Got offer:');
        var remoteDescription = new RTCSessionDescription(offer);

        var peer = _this.peers.find(function (peer) {
          return peer.id === peerId;
        });

        if (peer) {
          peer.peerConnection.setRemoteDescription(remoteDescription);
          return;
        }

        var config = {
          id: peerId
        };
        var signalPeer = new Peer(config, _this, remoteDescription);

        _this.peers.push(signalPeer);
      },
      // Peer Answer
      'peer:answer': function peerAnswer(peerId, answer) {
        console.log('Got answer:');

        var peer = _this.peers.find(function (peer) {
          return peer.id === peerId;
        });

        if (peer) {
          peer.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
      },
      // Peer ICE
      'peer:ice': function peerIce(peerId, ice) {
        console.log('Got ice:');

        var peer = _this.peers.find(function (peer) {
          return peer.id === peerId;
        });

        if (peer) {
          peer.peerConnection.peerConnection.addIceCandidate(new RTCIceCandidate(ice));
        }
      }
    };
  }
  /*
   * Actions
   */


  _createClass(BobRTC, [{
    key: "connect",
    value: function connect() {
      // Connect to master server
      if (this.signalingHandler) {
        this.signalingHandler.connect();
      }

      return Promise.resolve();
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      if (this.signalingHandler) {
        this.signalingHandler.disconnect();
      } // Disconnect from master server


      return Promise.resolve();
    }
  }, {
    key: "joinRoom",
    value: function joinRoom(room) {
      // Joins a room
      return this.signalingHandler.joinRoom(room);
    }
  }, {
    key: "leaveRoom",
    value: function leaveRoom() {
      return this.signalingHandler.leaveRoom();
    }
  }, {
    key: "getPeers",
    value: function getPeers() {
      // Get all peers in this room
      return this.peers; // TODO deep copy the array?
    }
  }, {
    key: "getMe",
    value: function getMe() {
      // Get the peer representing you
      return Object.assign({}, this.me); // TODO Deep copy?
    }
    /*
     * Sends an RPC message to the server.
     * This should be used to send application specific actions.
     * Should not be used to send chat messages!
     *
     * @param method The name of the RPC method
     * @param data Whatever payload you want to sent to the peer
     */

  }, {
    key: "notify",
    value: function notify(method, data) {
      // Sends a message to the connection server, no sensitive information should be passed through this method.
      this.signalingHandler.signal(method, data);
    }
    /*
     * Sends an RPC request to the server.
     * This should be used to send application specific actions.
     * Should not be used to send chat messages!
     *
     * @param method The name of the RPC method
     * @param data Whatever payload you want to sent to the peer
     */

  }, {
    key: "request",
    value: function request(method, data) {
      var _this2 = this;

      // Sends a message to the connection server, no sensitive information should be passed through this method.
      return new Promise(function (resolve, reject) {
        _this2.signalingHandler.signal(method, data);
      });
    }
  }]);

  return BobRTC;
}();