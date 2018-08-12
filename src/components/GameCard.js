import React from 'react';
import Teams from "../lib/teams";
import { Link } from 'react-router-dom';

// This renders a game passed in as "DET-GB"
class GameCard extends React.Component {

  constructor(props) {
    super(props);
    let homeTeam = Teams[props.home];
    let awayTeam = Teams[props.away];
    this.state = {
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      gameDate: props.gameDate,
      gameStatus: null,
      gameResult: null,
    }
  }

  componentWillMount() {
    //TODO lookup the status of the game from myapifeeds
    this.setState({
      gameStatus: "Not Started",
      gameResult: {
        homeScore: null,
        awayScore: null
      },
    })
  }

  render() {
    return( 
      <div>
        <p>Home</p>
        <p>{this.state.homeTeam.fullName}</p>
        <p>Away</p>
        <p>{this.state.awayTeam.fullName}</p>
        <p>Home Score</p>
        <p>{this.state.gameResult.homeScore}</p>
        <p>Away Score</p>
        <p>{this.state.gameResult.awayScore}</p>
        <p>Game Status</p>
        <p>{this.state.gameStatus}</p>
        <Link className="table-link" to={"/start?home=" + this.state.homeTeam.teamCode + "&away=" + this.state.awayTeam.teamCode + "&date=" + this.state.gameDate}>Bet on me!</Link>
      </div>)
  }
}

export default GameCard