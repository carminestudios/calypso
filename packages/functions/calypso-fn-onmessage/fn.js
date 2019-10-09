const { getConnections } = require('@carminestudios/calypso-persistence');
const { postToConnection, broadcast } = require('@carminestudios/calypso-comms');

/*
  Message structure


  // Post to other client
  {
    method: 'post',
    params: ['some_client_id', {
      method: 'log',
      params: ['Hello', 'World'],
    }],
  }

  // Broadcast to all clients
  {
    method: 'broadcast',
    params: [{
      method: 'log',
      params: ['Hello', 'World'],
    }],
  }

*/

const onMessage = async (wsClient, message) => {
  console.log('handling message', message);
  let parsedMessage = null;
  try {
    parsedMessage = JSON.parse(message.data);
  } catch {
    console.log('Could not parse message!');
    return;
  }
  
  const method = parsedMessage.method;
  const params = parsedMessage.params;

  if (typeof method !== 'string') {
    console.log('Could not parse method name from socket message');
    return;
  }
  if (params !== null && 
      params !== undefined &&
      !Array.isArray(params)) {
    console.log('Could not parse params from socket message');
    return;
  }

  switch (method) {
    case 'post':
      const peerId = params[0];
      const postMessage = params[1];
      await postToConnection(wsClient, { peerId, message: postMessage });
      break;
    case 'broadcast':
        const broadcastMessage = params[0];
        await broadcast(wsClient, { message: broadcastMessage });
      break;
    default:
      console.log('unrecognized rpc method', method, params);
      break;
  }
};

module.exports = onMessage;
