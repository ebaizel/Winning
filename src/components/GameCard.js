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
      <table><tbody>
        <tr>
          <td>{this.state.homeTeam.fullName}</td>
          <td>{this.state.awayTeam.fullName}</td>
          <td>{this.state.gameResult.homeScore}</td>
          <td>{this.state.gameResult.awayScore}</td>
          <td>{this.state.gameStatus}</td>
          <td><Link className="table-link" to={"/tournament?home=" + this.state.homeTeam.teamCode + "&away=" + this.state.awayTeam.teamCode + "&date=" + this.state.gameDate}>Bet on me!</Link></td>
        </tr>
      </tbody>
      </table>
    )
  }
}

export default GameCard