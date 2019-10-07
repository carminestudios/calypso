'use strict'

const initialState = {
  peers: [],
  me: {
    name: "unknown",
    stream: null,
  },
};

const peers = (state = initialState, action) => {
  switch(action.type) {
    case 'PEER_CONNECTED': return peerConnected(state, action.peerConfig)
		case 'PEER_DISCONNECTED': return peerDisconnected(state, action.peerConfig)
		case 'ME_MEDIA': return meStream(state, action.media)
    default: return state
  }
}

const peerConnected = (state, peerConfig) => {
  return state;
}

const peerDisconnected = (state, peerConfig) => {
  return state;
}

const meStream = (state, stream) => {
  const me = {
    stream: stream,
    name: "connected",
  };
  return Object.assign({}, state, {
    peers: [me],
		me,
	});
}

export default peers;
