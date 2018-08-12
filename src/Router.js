import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Tournament from './components/Tournament';
import Home from './components/Home';

const Routing = () => (
  <BrowserRouter>
  <div>
    <Switch>
      <Route path="/:tournamentAddress" component={Tournament}/>
      <Route path="/" component={Home}/>
    </Switch>
  </div>
  </BrowserRouter>
)
export default Routing  