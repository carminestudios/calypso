import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import { iceServers } from './utils';
/*
	Notes:
  * An RTCPeerConnection is an object used to send and receive streams between two clients.
  * An RTCPeerConnection when created tries to find ice candidates (a way for another client to connect us).
  * An external messaging channel is needed to relay ice information between clients.
	* When a client receives an external ice candidate it should be added to the corresponding RTCPeerConnection to allow the clients to connect.
	*
*/

var offerOptions = {
  // New spec states offerToReceiveAudio/Video are of type long (due to
  // having to tell how many "m" lines to generate).
  // http://w3c.github.io/webrtc-pc/#idl-def-RTCOfferAnswerOptions.
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};
export var BobPeerConnection =
/*#__PURE__*/
function () {
  function BobPeerConnection(config, connectionOffer) {
    var _this = this;

    _classCallCheck(this, BobPeerConnection);

    var rtcPeerConnectionConfig = {
      iceServers: config && config.iceServers ? config.iceServers : iceServers
    };
    this.config = config;
    this.isCaller = !connectionOffer;
    this.iceCandidates = [];
    this.streams = [];
    this.dataChannels = [];
    this.onicecandidate = config && config.onicecandidate ? config.onicecandidate : function () {};
    this.onoffer = config && config.onoffer ? config.onoffer : function () {};
    this.onanswer = config && config.onanswer ? config.onanswer : function () {};
    this.onaddstream = config && config.onaddstream ? config.onaddstream : function () {};
    this.ondatachannel = config && config.ondatachannel ? config.ondatachannel : function () {};
    var connection = {
      optional: [{
        DtlsSrtpKeyAgreement: true
      }, {
        RtpDataChannels: true
      }]
    };
    this.peerConnection = new RTCPeerConnection(rtcPeerConnectionConfig, connection);
    this.defaultDataChannel = this.peerConnection.createDataChannel('defaultChannel');

    this.peerConnection.onicecandidate = function (iceCandidate) {
      _this.iceCandidates.push(iceCandidate);

      console.log('Got iceCandidate: ', iceCandidate);

      _this.onicecandidate(iceCandidate);
    };

    this.peerConnection.onaddstream = function (event) {
      _this.streams.push(event);

      console.log('Got stream:', event);

      _this.onaddstream(event);
    };

    this.peerConnection.oniceconnectionstatechange = function (event) {
      console.log('oniceconnectionstatechange:', _this.peerConnection.iceConnectionState, event);
    };

    this.peerConnection.onicegatheringstatechange = function (event) {
      console.log('onicegatheringstatechange:', _this.peerConnection.iceGatheringState, event);
    };

    this.peerConnection.onnegotiationneeded = function (event) {
      console.log('onnegotiationneeded:', event);

      if (_this.isCaller) {
        _this._localDescription = _this.peerConnection.createOffer(offerOptions).then(function (localDescription) {
          _this.peerConnection.setLocalDescription(localDescription);

          console.log('local description:', localDescription);

          _this.onoffer(localDescription);
        })["catch"](function (err) {
          console.log('local description ERROR:', err);
        });
      }
    };

    this.peerConnection.onsignalingstatechange = function (event) {
      console.log('onsignalingstatechange:', _this.peerConnection.signalingState, event);
    };

    this.peerConnection.onremovestream = function (event) {
      console.log('onremovestream:', event);
    };

    this.peerConnection.ondatachannel = function (event) {
      _this.dataChannels.push(event);

      console.log('Got data channel:', event);
      var dataChannel = event.channel;

      dataChannel.onopen = function () {
        console.log('Data channel open!');
      };

      dataChannel.onclose = function () {
        console.log('Data channel closed!');
      };

      dataChannel.onmessge = function (message) {
        console.log('Data channel message!', message);
      };

      _this.ondatachannel(event);
    };

    if (this.isCaller) {
      this._localDescription = this.peerConnection.createOffer(offerOptions).then(function (localDescription) {
        _this.peerConnection.setLocalDescription(localDescription);

        console.log('local description:', localDescription);

        _this.onoffer(localDescription);
      })["catch"](function (err) {
        console.log('local description ERROR:', err);
      });
    } else {
      this.setRemoteDescription(connectionOffer);
    }
  } // readonly


  _createClass(BobPeerConnection, [{
    key: "getLocalDescription",
    value: function getLocalDescription() {
      return this._localDescription;
    }
  }, {
    key: "getRemoteDescription",
    value: function getRemoteDescription() {
      return this._remoteDescription;
    }
  }, {
    key: "setRemoteDescription",
    value: function setRemoteDescription(description) {
      var _this2 = this;

      this._remoteDescription = description;
      this.peerConnection.setRemoteDescription(description);

      if (!this.isCaller) {
        this._localDescription = this.peerConnection.createAnswer(offerOptions).then(function (localDescription) {
          _this2.peerConnection.setLocalDescription(localDescription);

          console.log('local description:', localDescription);

          _this2.onanswer(localDescription);
        })["catch"](function (err) {
          console.log('local description ERROR:', err);
        });
      } // this.dataChannel = this.peerConnection.createDataChannel('sampleChannel', null);

    }
  }]);

  return BobPeerConnection;
}();