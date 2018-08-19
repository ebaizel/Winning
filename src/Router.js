import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import Tournament from './components/Tournament';
import Home from './components/Home';

const Routing = () => (
  <HashRouter>
  <div>
    <Switch>
      <Route path="/tournament/:tournamentAddress" component={Tournament}/>
      <Route path="/tournament" component={Tournament}/>
      <Route path="/" component={Home}/>
    </Switch>
  </div>
  </HashRouter>
)
export default Routing  