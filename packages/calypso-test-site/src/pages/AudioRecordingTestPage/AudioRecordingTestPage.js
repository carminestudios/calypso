import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const AudioRecordingTestPage = (props) => {
  const mediaRecorderRef = React.useRef(null);
  const [audioChunks, setAudioChunks] = React.useState([]);

  const handleStart = React.useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.start(1000);

    mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
      setAudioChunks((current) => {
        return [...current, event.data];
      });
    });
  }, [mediaRecorderRef, setAudioChunks]);

  const handleStop = React.useCallback(() => {
    mediaRecorderRef.current.stop();
  }, [mediaRecorderRef]);

  console.log(audioChunks);
  return (
    <div>
      <button onClick={handleStart} type="button">
        Start recording
      </button>
      <button onClick={handleStop} type="button">
        Stop recording
      </button>
      {audioChunks.map((chunk) => null)}
    </div>
  );
};

AudioRecordingTestPage.propTypes = {};

export default AudioRecordingTestPage;
