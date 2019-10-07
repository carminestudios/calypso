const HTTPS_PORT = 8443;

const signaling = require('./signaling');

const fs = require('fs');
const https = require('https');

// Yes, SSL is required
const serverConfig = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};


// ----------------------------------------------------------------------------------------

// Create a server for the client html page
var handleRequest = function(request, response) {
    // Render the single client html file for any request the HTTP server receives
    console.log('request received: ' + request.url);

    if (request.url === '/') {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(fs.readFileSync('../bobrtc-client/dist/index.html'));
    } else if (request.url === '/tiny-sample.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('../bobrtc-client/dist/tiny-sample.js'));
    } else {
      if (request.url.indexOf('.js') >= 0) {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
      } else {
        response.writeHead(200);
      }
      response.end(fs.readFileSync('../bobrtc-client/dist' + request.url));
    }
};

var httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT, '0.0.0.0');

// ----------------------------------------------------------------------------------------

signaling(httpsServer);

console.log('Server running. Visit https://localhost:' + HTTPS_PORT + ' in Firefox/Chrome (note the HTTPS; there is no HTTP -> HTTPS redirect!)');
