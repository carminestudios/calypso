const connections = [];

const init = () => {
  // NOOP
};

const addConnection = (connection) => {
  const conn = {
    id: Math.random()
      .toString(32)
      .substring(2),
    ...connection,
  };
  connections.push(conn);
  return Promise.resolve(conn);
};

const removeConnection = (id) => {
  connections.splice(connections.findIndex((conn) => conn.id === id), 1);
  return Promise.resolve();
};

const getConnections = () => Promise.resolve(connections);

module.exports = {
  init,
  addConnection,
  removeConnection,
  getConnections,
};
