const { addConnection, getConnections } = require('@carminestudios/calypso-persistence');
const { postToConnection, broadcast } = require('@carminestudios/calypso-comms');

const onConnect = async (wsClient, connectionData) => {
  console.log('adding connection', connectionData);
  const connection = await addConnection(connectionData);
  console.log('connection added');
  await postToConnection(wsClient, {
    peerId: connection.id,
    message: { method: 'me', params: [{ id: connection.id }] },
  });
  const connections = await getConnections();
  const connectionIds = connections.map(connection => ({id: connection.id}));
  await broadcast(wsClient, {
    message: { method: 'peers', params: [connectionIds] },
  });
  return connection;
};

module.exports = onConnect;
