const { removeConnection, getConnections } = require('@carminestudios/calypso-persistence');
const { broadcast } = require('@carminestudios/calypso-comms');

const onDisconnect = async (wsClient, connectionId) => {
  console.log('removing connection', connectionId);
  await removeConnection(connectionId);
  console.log('connection removed');
  const connections = await getConnections();
  const connectionIds = connections.map(connection => ({id: connection.id}));
  await broadcast(wsClient, {
    message: { method: 'peers', params: connectionIds },
  });
};

module.exports = onDisconnect;
