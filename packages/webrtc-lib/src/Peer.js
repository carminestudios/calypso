import { BobPeerConnection } from './BobPeerConnection';

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
export class Peer /* extends EventEmoitter */ {
  constructor(config, bobrtc, connectionOffer) {
    this.config = config;
    this.bobrtc = bobrtc; // Will be used to get the signaling handler
    this.id = config.id;
    this.name = null;
    this.availableStreams = config.streams; // Streams that the peer is capable of sending
    this.capabilities = {};

    const peerConnectionConfig = {
      onicecandidate: (event) => {
        console.log('Send ICE:', event);
        if (event.candidate) {
          this.notify('ice', [event.candidate]);
        }
      },
      onoffer: (offer) => {
        console.log('Send Offer:', offer);
        this.notify('offer', [offer]);
      },
      onanswer: (answer) => {
        console.log('Send Answer:', answer);
        this.notify('answer', [answer]);
      },
      ondatachannel: (datachannel) => {
        console.log('Got Data Channel:', datachannel);
      },
    };
    const peerConnection = new BobPeerConnection(peerConnectionConfig, connectionOffer);
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
  notify(method, params) {
    // Sends a message to the peer but through the connection server, no sensitive information should be passed through this method.
    const messageParams = [
      this.id,
      JSON.stringify({
        method: `peer:${method}`,
        params: [this.bobrtc.me.id].concat(params),
      }),
    ];
    this.bobrtc.signal('message', messageParams);
  }

  // TODO: Need to implement this between peers (no need to implement on the server)
  // request(method, params) {
  // 	// Sends a message to the peer but through the connection server, no sensitive information should be passed through this method.
  // 	const messageData = {
  // 		peer: this.id,
  // 		method,
  // 		data,
  // 	};
  // 	return this.bobrtc.request(SERVER_METHODS.PEER_MESSAGE, messageData);
  // }

  sendTCPDataStream(dataStream) {}

  sendUDPDataStream(dataStream) {}

  /*
   * Starts streaming your media stream to the peer.
   * @param mediaStream Any type of WebRTC media stream (Video, Audio,
   * ScreenCapture, TabCapture)
   *
   * The peer will receive an event giving them the possibility to accept the
   * incoming stream. If they do accept the stream the returned promise will
   * resolve. If they decline the stream the promise will be rejected.
   */
  sendMediaStream(mediaStream) {
    // Create RTCPeerConnection
    const bobPeerOutConnection = new BobPeerOutConnection(mediaStream);
    bobPeerOutConnection.getLocalDescription().then((localDescription) => {
      // Send offer to peer
      request('offer', JSON.stringify({ sdp: desc })).then((remoteDescription) => {
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
  stopSendingMediaStream(mediaStream) {
    return Promise.resolve();
  }
}
