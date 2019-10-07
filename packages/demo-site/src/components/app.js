'use strict'

import React, { Component } from 'react';
import { createStore } from 'redux'
import peers from '../reducers/peers';

import Logo from './Logo';
import MeStreamView from './MeStreamView';
import PeerStreamView from './PeerStreamView';

import BobRTC from '../bobrtc/index';

// import Counter from './counter'
// import counter from '../reducers/counter'

const store = createStore(peers);

const bobrtc = new BobRTC('10.129.5.150');

window.bobrtc = bobrtc;

class App extends Component {
  constructor() {
    store.subscribe(() => {
      this.setState({ peers: store.getState() });
    });
    // Get default state
    this.setState({ peers: store.getState() });

  }

  render() {

    return (
      <div>
        <div onClick={()=>{
          navigator.getUserMedia({video:true}, (media) => {
            window.camerastream = media;
            store.dispatch({ type: 'ME_MEDIA', media });
          }, (err) => {
            console.log(err)
          });
        }}> Start Camera </div>
        <Logo />
        // <MeStreamView me={this.state.peers.me}/>
        {this.state.peers.peers.map((peer) => (
          <PeerStreamView peer={peer} />
        ))}
      </div>
    )
  }
}

export default App
