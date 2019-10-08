const AWS = require('aws-sdk');
const { getConnections } = require('@carminestudios/calypso-persistence');

module.exports = {
  init({ event }) {
    return Promise.reject();
  },

  async postToConnection(client, { peerId, message }) {
    const connections = await getConnections();
    const connection = connections.find(({ id }) => id === peerId);
    if (connection) {
      client.postToConnection({ ConnectionId: connection.connectionId, Data: message }).promise();
    }
  },
};
