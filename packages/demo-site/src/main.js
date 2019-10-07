'use strict'
import { h } from 'preact'; // Make JSX parser abailable everywhere
import React, { render } from 'react';
import App from './components/app';

window.h = h;

render(<App />, document.querySelector('[data-js="main"]'));
