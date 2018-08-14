import React from 'react'
import Schedule from "../lib/schedule";
import GameCard from "./GameCard";

class Home extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      games: []
    }
  }

  componentWillMount() {  
    const games = Schedule.getGames();
    this.setState({games});
  }

  render() {
    return (
      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="#" className="pure-menu-heading pure-menu-link">NFL Weiger</a>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
            <table><tbody>
            {this.state.games.map(function(props, index) {
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
          </div>
        </main>
      </div>
    );
  }
}

export default Home