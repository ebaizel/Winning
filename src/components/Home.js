import React from 'react'
import Schedule from "../lib/schedule";
import GameCard from "./GameCard";

class Home extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      gamesByWeek: {}
    }
  }

  componentWillMount() {  
    const gamesByWeek = Schedule.getGamesByWeek();
    this.setState({gamesByWeek});
  }

  render() {
    return (
      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
          <h4 className="site-menu">NFL Weiger</h4>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1 className="site-header">WEIGER 🏈 🏆</h1>
              <div className="instructions">
                <p>Welcome to Weiger!</p>
                <p>Bet on NFL games with Ethereum, and payouts happen automatically.  To get started, pick a game from the list below.  Good luck!</p>
              </div>
              <div className="games-list-header">
              {Object.keys(this.state.gamesByWeek).map(weekNumber => {
                return ([
                <h3 className="week-number">Week {weekNumber} Games</h3>,
                <div>
                  <table><tbody>
                  {this.state.gamesByWeek[weekNumber].games.map(function(props, index) {
                    return(
                      <tr key={index}>
                        <td>
                          <GameCard {...props} key={index}/>
                        </td>
                      </tr>)
                  })}
                  </tbody>
                  </table>
                </div>
                ])
              })}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default Home