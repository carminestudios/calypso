import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { WSRTCTestPage, AudioRecordingTestPage } from './pages';

const App = () => (
  <Router>
    <Switch>
      <Route path="/wsrtc" component={WSRTCTestPage} />
      <Route path="/audiorecordingtest" component={AudioRecordingTestPage} />
      <Redirect to="/wsrtc" />
    </Switch>
  </Router>
);

export default App;
