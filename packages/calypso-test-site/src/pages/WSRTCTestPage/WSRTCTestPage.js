import React from 'react';
import styled from 'styled-components';
import { BobRTC } from '@carminestudios/webrtc-lib';
import Terminal from './Terminal';

const Container = styled.div`
  display: flex;
`;

const Controls = styled.div`
  flex: 1;
  padding: 1rem;
`;

const Output = styled.div`
  flex: 1;
  padding: 0;
  border-left: 2px dashed #555;
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const append = (setter, value) => setter((current) => [...current, value]);

const WSRTCTestPage = () => {
  const wsClientRef = React.useRef(null);
  const [wsLog, setWsLog] = React.useState([]);
  const [rtcLog, setRtcLog] = React.useState([]);
  const [clientId, setClientId] = React.useState('');
  const [postMessage, setPostMessage] = React.useState('Hello World!');
  const handleConnect = React.useCallback(
    async (event) => {
      event.preventDefault();
      append(setWsLog, 'Connecting...');
      const websocketUrl = `ws://${window.location.hostname}:8080`;
      wsClientRef.current = new BobRTC(websocketUrl);
      wsClientRef.current.connect();
      wsClientRef.current.on('open', () => append(setWsLog, 'Connected'));
      wsClientRef.current.on('message', (message) => {
        append(setWsLog, `Received: ${JSON.stringify(message, null, 2)}`);
        if (message.method === 'peers') {
          const peers = message.params;
          const lastPeer = peers[peers.length - 1];
          if (clientId.length < 1) {
            setClientId(lastPeer.id);
          }
        }
      });
    },
    [wsClientRef, setWsLog, clientId],
  );
  const handlePost = React.useCallback((event) => {
    event.preventDefault();
    console.log(clientId, postMessage);
    wsClientRef.current.signal('post', [clientId, postMessage]);
  }, [clientId, postMessage, wsClientRef]);
  const handleBroadcast = React.useCallback((event) => {
    event.preventDefault();
    console.log(postMessage);
    wsClientRef.current.signal('broadcast', [postMessage]);
  }, [postMessage, wsClientRef]);

  return (
    <Container>
      <Controls>
        <button onClick={handleConnect} type="button">
          Connect
        </button>
        <br />
        clientId: 
        <input value={clientId} onChange={(event) => setClientId(event.target.value)} />
        <br />
        postMessage: 
        <input value={postMessage} onChange={(event) => setPostMessage(event.target.value)} />
        <br />
        <button onClick={handlePost} type="button">
          Post
        </button>
        <button onClick={handleBroadcast} type="button">
          Broadcast
        </button>
      </Controls>
      <Output>
        <Terminal title="WebSocket" lines={wsLog} />
        <Terminal title="WebRTC" lines={rtcLog} />
      </Output>
    </Container>
  );
}

export default WSRTCTestPage;
