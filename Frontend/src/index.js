import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { Anchor } from 'ual-anchor';
import { UALProvider } from 'ual-reactjs-renderer';
import App from './App';

const appName = 'unregbp-app';
const chain = {
  chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4',
  rpcEndpoints: [
    {
      host: 'wax.greymass.com',
      port: 443,
      protocol: 'https'
    }
  ]
};

const anchor = new Anchor([chain], { appName });

ReactDOM.render(
  <Router>
    <UALProvider chains={[chain]} authenticators={[anchor]} appName={appName}>
      <App />
    </UALProvider>
  </Router>,
  document.getElementById('root')
);