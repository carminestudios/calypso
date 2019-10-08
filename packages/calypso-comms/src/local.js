// eslint-disable-next-line import/no-extraneous-dependencies
const { getConnections } = require('@carminestudios/calypso-persistence');

module.exports = {
  initClient() {
    return Promise.resolve();
  },

  async postToConnection(client, { peerId, message }) {
    const connections = await getConnections();
    const connection = connections.find(({ id }) => id === peerId);
    if (connection) {
      connection.wsClient.send(JSON.stringify(message));
    }
  },

  async broadcast(client, { message }) {
    const connections = await getConnections();
    connections.forEach((connection) => connection.wsClient.send(JSON.stringify(message)));
  },
};
