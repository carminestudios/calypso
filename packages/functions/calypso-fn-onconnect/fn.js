const { addConnection } = require('@carminestudios/calypso-persistence');
const { postToConnection } = require('@carminestudios/calypso-comms');

const onConnect = async (wsClient, connectionData) => {
  console.log('adding connection', connectionData);
  const connection = await addConnection(connectionData);
  console.log('connection added');
  await postToConnection(wsClient, {
    peerId: connection.id,
    message: { method: 'me', params: { id: connection.id } },
  });
  return connection;
};

module.exports = onConnect;
