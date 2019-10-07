const connections = [];

const init = () => {
  // NOOP
};

const addConnection = ({ connectionId }) => {
  connections.push({ connectionId });
  return Promise.resolve();
};

const removeConnection = (connectionId) => {
  connections.splice(connections.findIndex((conn) => conn.connectionId === connectionId), 1);
  return Promise.resolve();
};

const getConnections = () => Promise.resolve(connections);

module.exports = {
  init,
  addConnection,
  removeConnection,
  getConnections,
};
