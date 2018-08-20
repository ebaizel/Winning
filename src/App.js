import React, { Component } from 'react';
import {Helmet} from "react-helmet";
import Router from './Router';

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

class App extends Component {
  render() {
    return (
      <div className="App">
        <Helmet>
          <meta charSet="utf-8" />
          <meta Content-Security-Policy="default-src 'self' *.ngrok.com img-src *" />
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous"/>
          <title>Weiger</title>
        </Helmet>
        <Router/>
      </div>
    );
  }
}

export default App;