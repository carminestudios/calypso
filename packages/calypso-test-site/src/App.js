import React from 'react';
import styled from 'styled-components';
import { SignalingHandler } from '@carminestudios/webrtc-lib';
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

function App() {
  const wsClientRef = React.useRef(null);
  const [wsLog, setWsLog] = React.useState([]);
  const [rtcLog, setRtcLog] = React.useState([]);

  const handleConnect = React.useCallback(
    async (event) => {
      event.preventDefault();
      append(setWsLog, 'Connecting...');
      wsClientRef.current = new SignalingHandler(`ws://${window.location.hostname}:8080`);
      wsClientRef.current.connect();
      wsClientRef.current.on('open', () => append(setWsLog, 'Connected'));
      wsClientRef.current.on('message', (message) =>
        append(setWsLog, `Received: ${JSON.stringify(message, null, 2)}`),
      );
    },
    [wsClientRef, setWsLog],
  );

  return (
    <Container>
      <Controls>
        <button onClick={handleConnect} type="button">
          Connect
        </button>
      </Controls>
      <Output>
        <Terminal title="WebSocket" lines={wsLog} />
        <Terminal title="WebRTC" lines={rtcLog} />
      </Output>
    </Container>
  );
}

export default App;
