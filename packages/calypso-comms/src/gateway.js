const { getConnections } = require('@carminestudios/calypso-persistence');

module.exports = {
  init({ event }) {
    return Promise.reject();
  },

  async postToConnection(client, { peerId, message }) {
    const connections = await getConnections();
    const connection = connections.find(({ id }) => id === peerId);
    if (connection) {
      client
        .PostToConnection({ ConnectionId: connection.connectionId, Data: JSON.stringify(message) })
        .promise();
    }
  },

  async broadcast(client, { message }) {
    const connections = await getConnections();
    connections.forEach((connection) =>
      client.PostToConnection({
        ConnectionId: connection.connectionId,
        Data: JSON.stringify(message),
      }),
    );
  },
};
