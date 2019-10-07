import {SignalingHandler, SIGNALING_EVENTS} from './SignalingHandler';
import MessageQueue from './MessageQueue';
import Peer from './Peer';
import uuid from 'uuid';

// enum SERVER_METHODS {
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
export class BobRTC /* extends EventEmitter */ {
	constructor(masterServerURL, signalingHandler) {
		this.masterServerURL = masterServerURL;
		this.peers = [];
		this.me = {
			id: null,
			name: null,
		};
		this.roomConfig = null;
		//this.messageQueue = new MessageQueue();
		this.signalingHandler = signalingHandler ? signalingHandler : new SignalingHandler(masterServerURL);

		this.signalingHandler.onSignal = (data) => {
			// Wisper message
			try {
				const method = data.method;
				const params = data.params;
				this._signalingMethods[method].apply(null, params);
			} catch (err) {
				console.log(err);
			}

			// Server says!
			//console.log('Server says: ' + JSON.stringify(data));
		};

		this._signalingMethods = {
			'me': (info) => {
				this.me.id = info.id;
				console.log('My server assigned id is: ', this.me.id);
			},
			// All peers connected to the server at the moment
			'peers': (peers) => {
				const filteredPeers = peers.filter(peer => (peer.id !== this.me.id));

				for (var i = 0; i < filteredPeers.length; i++) {
					const peerInfo = filteredPeers[i];
					const config = {
						id: peerInfo.id,
					};
					const signalPeer = new Peer(config, this);
					this.peers.push(signalPeer);
				}
				console.log('Got list of peers: ', peers);
			},
			// Updated peer
			'peer:update': (peerId, params) => {

			},
			// // Disconnected peer
			// 'peer:~': (peerId) => {
      //
			// },
			// Peer Offer
			'peer:offer': (peerId, offer) => {
				console.log('Got offer:');
				const remoteDescription = new RTCSessionDescription(offer);
				const peer = this.peers.find((peer) => (peer.id === peerId));
				if (peer) {
					peer.peerConnection.setRemoteDescription(remoteDescription);
					return;
				}

				const config = {
					id: peerId,
				};
				const signalPeer = new Peer(config, this, remoteDescription);
				this.peers.push(signalPeer);
			},
			// Peer Answer
			'peer:answer': (peerId, answer) => {
				console.log('Got answer:');
				const peer = this.peers.find((peer) => (peer.id === peerId));
				if (peer) {
					peer.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
				}
			},
			// Peer ICE
			'peer:ice': (peerId, ice) => {
				console.log('Got ice:');
				const peer = this.peers.find((peer) => (peer.id === peerId));
				if (peer) {
					peer.peerConnection.peerConnection.addIceCandidate(new RTCIceCandidate(ice));
				}
			},
		};
	}

	/*
	 * Actions
	 */
	connect() {
		// Connect to master server
		return Promise.resolve();
	}

	disconnect() {
		// Disconnect from master server
		return Promise.resolve();
	}

	joinRoom(room) {
		// Joins a room
		return this.signalingHandler.joinRoom(room);
	}

	leaveRoom() {
		return this.signalingHandler.leaveRoom();
	}

	getPeers() {
		// Get all peers in this room
		return this.peers; // TODO deep copy the array?
	}

	getMe() {
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
	notify(method, data) {
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
	request(method, data) {
		// Sends a message to the connection server, no sensitive information should be passed through this method.
		return new Promise((resolve, reject) => {
			this.signalingHandler.signal(method, data);
		});
	}
}

export default BobRTC;
