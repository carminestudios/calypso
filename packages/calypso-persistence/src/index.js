if (process.env.NODE_ENV === 'production') {
  module.exports = require('./db');
} else {
  module.exports = require('./local');
}
