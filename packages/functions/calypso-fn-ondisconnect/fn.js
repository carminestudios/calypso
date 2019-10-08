const { removeConnection } = require('@carminestudios/calypso-persistence');

const onDisconnect = async (connectionId) => {
  console.log('removing connection', connectionId);
  await removeConnection(connectionId);
  console.log('connection removed');
  return Promise.resolve();
};

module.exports = onDisconnect;
