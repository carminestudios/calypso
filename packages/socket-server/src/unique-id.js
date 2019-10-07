let counter = 0;
const uniqueId = () => {
	const id = 'BobRTCWebSocketClient_' + counter;
	counter++;
	return id;
};

module.exports = uniqueId;
