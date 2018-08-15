import React from 'react';
import Teams from "../lib/teams";
import { Link } from 'react-router-dom';

// This renders a game passed in as "DET-GB"
class GameCard extends React.Component {

  constructor(props) {
    super(props);

    let homeTeam = Teams[props.homeTeamCode];
    let awayTeam = Teams[props.awayTeamCode];

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
      <div className="game-card">
        <span>{this.state.awayTeam.fullName} at {this.state.homeTeam.fullName}</span>
        <Link className="link-bet" to={"/tournament?home=" + this.state.homeTeam.teamCode + "&away=" + this.state.awayTeam.teamCode + "&date=" + this.state.gameDate}>Bet on me!</Link>
      </div>
    )
  }
}

export default GameCard