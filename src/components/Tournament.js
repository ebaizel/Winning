import React from 'react';
import moment from 'moment-timezone';
import TournamentContract from '../../build/contracts/Tournament.json';
import getWeb3 from '../utils/getWeb3';
import queryString from 'query-string';
import Teams from "../lib/teams";

// async function getTxGasConsumption(web3, transactionHash) {
//   const transaction = await web3.eth.getTransaction(transactionHash);
//   const txReceipt = await web3.eth.getTransactionReceipt(transactionHash); // contains the actual gas consumed
//   console.log("transaction is ", transaction);
//   console.log("txreciept is ", txReceipt);
  
//   const gasPrice = transaction.gasPrice;
//   console.log("gas price is ", gasPrice);
//   return (gasPrice * txReceipt.gasUsed);
// }

class Tournament extends React.Component {
  constructor(props) {
    super(props);

    let tournamentAddress = props.match.params.tournamentAddress; // "0x03f5cbf1a881081683b4e116dc8a0a6d09bf294b",
    const queryParams = queryString.parse(props.location.search);

    this.state = {
      web3: null,
      tournamentAddress: tournamentAddress,
      queryParams: queryParams,
      tournamentInstance: null, //TODO: can probably remove this
      homePicker: "0x0000000000000000000000000000000000000000",
      awayPicker: "0x0000000000000000000000000000000000000000",
      isCompleted: false,
      isLocked: false,
      isWinnerPaid: false,
      wagerUSD: 1,
      mySportsFeedUser: "6f66a3d1-4b1e-4858-a1e6-6dd748",
      mySportsFeedPassword: "MYSPORTSFEEDS",
      awayScore: 0,
      homeScore: 0
    }

    this.checkForWinner = this.checkForWinner.bind(this);
    this.submitPick = this.submitPick.bind(this);
    this.handleWagerChange = this.handleWagerChange.bind(this);
  }

  generateMySportsFeedURLWithoutCreds(homeTeam, gameDate) {
    let myapiURL = "https://api.mysportsfeeds.com/v2.0/pull/nfl/2018-2019-regular/games.json?team=__team__&date=__date__";
    gameDate = gameDate.replace(/-/g, ''); //convert 2018-09-10 to 20180910
    myapiURL = myapiURL.replace("__team__", homeTeam.teamCode.toLowerCase()).replace("__date__", gameDate);
    return myapiURL;
  }

  generateMySportsFeedURL(homeTeam, gameDate) {
    let myapiURL = "https://__username__:__password__@api.mysportsfeeds.com/v2.0/pull/nfl/2018-2019-regular/games.json?team=__team__&date=__date__";
    gameDate = gameDate.replace(/-/, ''); //convert 2018-09-10 to 20180910
    myapiURL = myapiURL.replace("__username__", this.props.mySportsFeedUser).replace("__password__",this.props.mySportsFeedPassword).replace("__team__", homeTeam.teamCode.toLowerCase()).replace("__date__", gameDate);
    return myapiURL;
  }

  generateOracleURL() {
    // "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]"
    let mySportsFeedURL = this.generateMySportsFeedURL(this.state.homeTeam, this.state.gameDate);
    let oracleURL = "json(__mysportsfeedurl__).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";
    oracleURL = oracleURL.replace("__mysportsfeedurl__", mySportsFeedURL);
    console.log("oracle url is ", oracleURL);
    return oracleURL;
  }

  componentWillMount() {  
    getWeb3.then(async results => {
      this.setState({
        web3: results.web3
      })

      if (this.state.tournamentAddress != null) {
        return this.getTournamentState()
      } else {
        // set the properties into the state
        const queryParams = this.state.queryParams;
        const homeTeam = Teams[queryParams.home];
        const awayTeam = Teams[queryParams.away];
        const gameDate = queryParams.date;

        const realWorldGameState = await this.getRealWorldGameState(homeTeam, gameDate);

        this.setState({
          homeTeam,
          awayTeam,
          gameDate,
          homeTeamName: homeTeam.fullName,
          awayTeamName: awayTeam.fullName,
          isCompleted: realWorldGameState.isCompleted,
          awayScore: realWorldGameState.awayScore,
          homeScore: realWorldGameState.homeScore
        });
      }
    })
    .catch((err) => {
      console.log('Error finding web3.', err)
    })
  }

  async getRealWorldGameState(homeTeam, gameDate) {
    const mySportsFeedURL = this.generateMySportsFeedURLWithoutCreds(homeTeam, gameDate);
    let headers = new Headers();
    headers.append('Authorization', 'Basic ' + btoa(this.state.mySportsFeedUser + ':' + this.state.mySportsFeedPassword));
    
    return fetch(mySportsFeedURL, {headers: headers}).then(response => {
      return response.json()
    }).then(body => {
      if (body.games.length === 0) {
        console.log("ERROR: GAME DOES NOT EXIST.  CHECK THE URL.");
        //TODO: indicate on the page it is an invalid game
        return {};
      }

      let schedule = body.games[0].schedule;
      let score = body.games[0].score;
      
      let isCompleted = schedule.playedStatus === "COMPLETED" ? true : false;
      let awayScore = isCompleted ? score.awayScoreTotal : 0;
      let homeScore = isCompleted ? score.homeScoreTotal : 0;

      return {
        isCompleted,
        awayScore,
        homeScore
      }
    });
  }

  getTournamentInstance() {
    let tournamentInstance = new this.state.web3.eth.Contract(TournamentContract.abi, this.state.tournamentAddress);
    return tournamentInstance;
  }

  // Sets the tournament state in the component
  async getTournamentState() {
    let tournamentInstance = this.getTournamentInstance();

    const awayPicker = await tournamentInstance.methods.awayPicker().call();
    const wagerWei = await tournamentInstance.methods.wagerAmount().call();
    const homePicker = await tournamentInstance.methods.homePicker().call();
    const isCompleted = await tournamentInstance.methods.isCompleted().call();
    const isWinnerPaid = await tournamentInstance.methods.isWinnerPaid().call();
    const isLocked = await tournamentInstance.methods.isLocked().call();
    const homeTeamName = await tournamentInstance.methods.homeTeam().call();
    const awayTeamName = await tournamentInstance.methods.awayTeam().call();

    let stateParams = {
      homePicker,
      awayPicker,
      wagerWei,
      isWinnerPaid,
      isCompleted,
      isLocked,
      homeTeamName,
      awayTeamName
    }
    if (wagerWei > 0) {
      stateParams.wagerUSD = this.convertWagerWeiToUSD(wagerWei);
    }
    this.setState(stateParams);

  }

  async createTournament(params) {
    const contract = require('truffle-contract')
    const tournament = contract(TournamentContract)
    tournament.setProvider(this.state.web3.currentProvider);
    
    const account = await this.getCurrentAccount();
    const oracleURL = this.generateOracleURL();
    let instance = await tournament.new(oracleURL, params.isHome, this.state.homeTeam.fullName, this.state.awayTeam.fullName, {from: account, value: params.wager});

    this.setState({tournamentAddress: instance.address});
    return instance;
  }

  async submitPick(isHome) {
    const wagerInWei = this.getWagerInWei();
    if (this.state.tournamentAddress == null) {
      await this.createTournament({isHome, wager: wagerInWei});
    } else {
      let tournamentInstance = this.getTournamentInstance();
      let account = await this.getCurrentAccount();
      await tournamentInstance.methods.submitEntry(isHome).send({from: account, value: wagerInWei});
    }
    await this.getTournamentState();
  }

  async getAccounts() {
    return this.state.web3.eth.getAccounts()
  }

  async getCurrentAccount() {
    const accounts = await this.getAccounts();
    return accounts[0];
  }

  canSetWager() {
    return !this.state.tournamentAddress
  }

  getWagerInEth() {
    return (this.state.wagerUSD / 350);
  }

  getWagerInWei() {
    return this.state.web3.utils.toWei((this.state.wagerUSD / 350).toString(), "ether");
  }

  convertWagerWeiToUSD(wager) {
    return (this.state.web3.utils.fromWei(wager, "ether") * 350);
  }

  isHomePickAvailable() {
    return (this.state.homePicker === "0x0000000000000000000000000000000000000000")
  }

  isAwayPickAvailable() {
    return (this.state.awayPicker === "0x0000000000000000000000000000000000000000")
  }

  handleWagerChange(event) {
    this.setState({wagerUSD: event.target.value});
  }

  canCheckForWinner() {
    return this.state.isLocked && !this.state.isCompleted && !this.state.isWinnerPaid
  }

  async checkForWinner() {
    let account = await this.getCurrentAccount();
    let tournamentInstance = this.getTournamentInstance();
    await tournamentInstance.methods.updateResults().send({from: account});
  }

  render() {
    return (
      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="/" className="pure-menu-heading pure-menu-link">NFL Weiger</a>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>{this.state.homeTeamName} (HOME) vs {this.state.awayTeamName} (AWAY)</h1>
              <h3>{moment(this.state.gameDate).format("MMMM Do, YYYY")}</h3>
              <br/>
              <p>Pick one of the teams and set a wager.</p>
              
              <form>
                <label>Wager (USD)
                  <input style={{width: "60px", "textAlign": "center"}} type="text" value={this.state.wagerUSD} disabled={!this.canSetWager()} onChange={this.handleWagerChange}/><span>{this.getWagerInEth()} Ether</span>
                </label>
                <br/>
                <button disabled={!this.isHomePickAvailable()} onClick={(e) => {e.preventDefault(); this.submitPick(true)}}>Bet on the {this.state.homeTeamName}</button>
                <button disabled={!this.isAwayPickAvailable()} onClick={(e) => {e.preventDefault(); this.submitPick(false)}}>Bet on the {this.state.awayTeamName}</button>
                <br/><br/><br/>
                <button style={{backgroundColor: "green", color: "white"}} disabled={!this.canCheckForWinner()} onClick={this.checkForWinner}>Check For Winner</button>
                <br/><br/><br/>

                <p>Instructions</p>
                <p>...</p>
                <br/><br/><br/>

                <p>Contract Info</p>
                
                <p>Contract Address: {this.state.tournamentAddress}</p>
                <p>Home bettor: {this.state.homePicker}</p>
                <p>Away bettor: {this.state.awayPicker}</p>
                <p>Locked? {this.state.isLocked.toString()}</p>
                <p>Completed? {this.state.isCompleted.toString()}</p>
                <p>Winner Paid? {this.state.isWinnerPaid.toString()}</p>
                <p>Home score: {this.state.homeScore}</p>
                <p>Away score: {this.state.awayScore}</p>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default Tournament