import React from 'react';
import moment from 'moment-timezone';
import Teams from "../lib/teams";
import { Link } from 'react-router-dom';

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
    this.setState({
      gameStatus: "Not Started",
      gameResult: {
        homeScore: null,
        awayScore: null
      },
    })
  }

  formatGameDate(gameDate) {
    return moment(gameDate).format("MMMM Do")
  }

  render() {
    return( 
      <div className="game-card">
        <span className="game-card-date">{this.formatGameDate(this.state.gameDate)}</span>
        <span><b>{this.state.awayTeam.fullName}</b> at <b>{this.state.homeTeam.fullName}</b></span>
        <Link className="link-bet" to={"/tournament?home=" + this.state.homeTeam.teamCode + "&away=" + this.state.awayTeam.teamCode + "&date=" + this.state.gameDate}>Bet on me!</Link>
      </div>
    )
  }
}

export default GameCard