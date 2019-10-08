if (process.env.NODE_ENV === 'production') {
  module.exports = require('./gateway');
} else {
  module.exports = require('./local');
}
