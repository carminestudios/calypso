import { iceServers } from './utils';

/*
	Notes:
  * An RTCPeerConnection is an object used to send and receive streams between two clients.
  * An RTCPeerConnection when created tries to find ice candidates (a way for another client to connect us).
  * An external messaging channel is needed to relay ice information between clients.
	* When a client receives an external ice candidate it should be added to the corresponding RTCPeerConnection to allow the clients to connect.
	*
*/

const offerOptions = {
  // New spec states offerToReceiveAudio/Video are of type long (due to
  // having to tell how many "m" lines to generate).
  // http://w3c.github.io/webrtc-pc/#idl-def-RTCOfferAnswerOptions.
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1,
};

export class BobPeerConnection {
  constructor(config, connectionOffer) {
    const rtcPeerConnectionConfig = {
      iceServers: config && config.iceServers ? config.iceServers : iceServers,
    };
    this.config = config;
    this.isCaller = !connectionOffer;
    this.iceCandidates = [];
    this.streams = [];
    this.dataChannels = [];
    this.onicecandidate = config && config.onicecandidate ? config.onicecandidate : () => {};
    this.onoffer = config && config.onoffer ? config.onoffer : () => {};
    this.onanswer = config && config.onanswer ? config.onanswer : () => {};
    this.onaddstream = config && config.onaddstream ? config.onaddstream : () => {};
    this.ondatachannel = config && config.ondatachannel ? config.ondatachannel : () => {};

    const connection = { optional: [{ DtlsSrtpKeyAgreement: true }, { RtpDataChannels: true }] };

    this.peerConnection = new RTCPeerConnection(rtcPeerConnectionConfig, connection);
    this.defaultDataChannel = this.peerConnection.createDataChannel('defaultChannel');
    this.peerConnection.onicecandidate = (iceCandidate) => {
      this.iceCandidates.push(iceCandidate);
      console.log('Got iceCandidate: ', iceCandidate);
      this.onicecandidate(iceCandidate);
    };

    this.peerConnection.onaddstream = (event) => {
      this.streams.push(event);
      console.log('Got stream:', event);
      this.onaddstream(event);
    };

    this.peerConnection.oniceconnectionstatechange = (event) => {
      console.log('oniceconnectionstatechange:', this.peerConnection.iceConnectionState, event);
    };
    this.peerConnection.onicegatheringstatechange = (event) => {
      console.log('onicegatheringstatechange:', this.peerConnection.iceGatheringState, event);
    };
    this.peerConnection.onnegotiationneeded = (event) => {
      console.log('onnegotiationneeded:', event);

      if (this.isCaller) {
        this._localDescription = this.peerConnection
          .createOffer(offerOptions)
          .then((localDescription) => {
            this.peerConnection.setLocalDescription(localDescription);
            console.log('local description:', localDescription);
            this.onoffer(localDescription);
          })
          .catch((err) => {
            console.log('local description ERROR:', err);
          });
      }
    };
    this.peerConnection.onsignalingstatechange = (event) => {
      console.log('onsignalingstatechange:', this.peerConnection.signalingState, event);
    };
    this.peerConnection.onremovestream = (event) => {
      console.log('onremovestream:', event);
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannels.push(event);
      console.log('Got data channel:', event);

      const dataChannel = event.channel;
      dataChannel.onopen = () => {
        console.log('Data channel open!');
      };
      dataChannel.onclose = () => {
        console.log('Data channel closed!');
      };
      dataChannel.onmessge = (message) => {
        console.log('Data channel message!', message);
      };

      this.ondatachannel(event);
    };

    if (this.isCaller) {
      this._localDescription = this.peerConnection
        .createOffer(offerOptions)
        .then((localDescription) => {
          this.peerConnection.setLocalDescription(localDescription);
          console.log('local description:', localDescription);
          this.onoffer(localDescription);
        })
        .catch((err) => {
          console.log('local description ERROR:', err);
        });
    } else {
      this.setRemoteDescription(connectionOffer);
    }
  }

  // readonly
  getLocalDescription() {
    return this._localDescription;
  }

  getRemoteDescription() {
    return this._remoteDescription;
  }

  setRemoteDescription(description) {
    this._remoteDescription = description;
    this.peerConnection.setRemoteDescription(description);

    if (!this.isCaller) {
      this._localDescription = this.peerConnection
        .createAnswer(offerOptions)
        .then((localDescription) => {
          this.peerConnection.setLocalDescription(localDescription);
          console.log('local description:', localDescription);
          this.onanswer(localDescription);
        })
        .catch((err) => {
          console.log('local description ERROR:', err);
        });
    }

    // this.dataChannel = this.peerConnection.createDataChannel('sampleChannel', null);
  }
}
