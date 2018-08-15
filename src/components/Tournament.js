import React from 'react';
import moment from 'moment-timezone';
import queryString from 'query-string';

import TournamentContract from '../../build/contracts/Tournament.json';
import getWeb3 from '../utils/getWeb3';
import Teams from "../lib/teams";
import getCoinPrice from "../lib/coinPrice";

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
      wagerUSD: 10,
      mySportsFeedUser: "6f66a3d1-4b1e-4858-a1e6-6dd748",
      mySportsFeedPassword: "MYSPORTSFEEDS",
      awayScore: 0,
      homeScore: 0,
      awayTeam: {},
      homeTeam: {}
    }

    this.checkForWinner = this.checkForWinner.bind(this);
    this.submitPick = this.submitPick.bind(this);
    this.handleWagerChange = this.handleWagerChange.bind(this);
  }

  generateMySportsFeedURLWithoutCreds(homeTeam, gameDate) {
    let myapiURL = "https://api.mysportsfeeds.com/v2.0/pull/nfl/2018-2019-regular/games.json?team=__team__&date=__date__";
    gameDate = gameDate.replace(/-/g, ''); //convert 2018-09-10 to 20180910
    myapiURL = myapiURL.replace("__team__", homeTeam.teamCode.toLowerCase()).replace("__date__", gameDate);
    
    //myapiURL = "https://api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231";
    return myapiURL;
  }

  generateMySportsFeedURL(homeTeam, gameDate) {
    let myapiURL = "https://__username__:__password__@api.mysportsfeeds.com/v2.0/pull/nfl/2018-2019-regular/games.json?team=__team__&date=__date__";
    gameDate = gameDate.replace(/-/g, ''); //convert 2018-09-10 to 20180910
    myapiURL = myapiURL.replace("__username__", this.state.mySportsFeedUser).replace("__password__",this.state.mySportsFeedPassword).replace("__team__", homeTeam.teamCode.toLowerCase()).replace("__date__", gameDate);
    return myapiURL;
  }

  generateOracleURL() {
    let mySportsFeedURL = this.generateMySportsFeedURL(this.state.homeTeam, this.state.gameDate);
    let oracleURL = "json(__mysportsfeedurl__).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";
    oracleURL = oracleURL.replace("__mysportsfeedurl__", mySportsFeedURL);

    // const testURL = "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";
    // return testURL;
    return oracleURL;
  }

  componentWillMount() {  
    getWeb3.then(async results => {

      const ETHUSDPrice = await getCoinPrice();

      this.setState({
        web3: results.web3,
        ETHUSDPrice
      })

      if (this.state.tournamentAddress != null) {
        await this.getTournamentState();
        await this.getRealWorldGameState(this.state.homeTeam, this.state.gameDate);
      } else {

        const queryParams = this.state.queryParams;
        const homeTeam = Teams[queryParams.home];
        const awayTeam = Teams[queryParams.away];
        const gameDate = queryParams.date;

        await this.getRealWorldGameState(homeTeam, gameDate);

        this.setState({
          homeTeam,
          awayTeam,
          gameDate,
        });
      }
    })
    .catch((err) => {
      console.log('Error finding web3.', err)
    })
  }

  async getRealWorldGameState(homeTeam, gameDate) {
    const mySportsFeedURL = this.generateMySportsFeedURLWithoutCreds(homeTeam, gameDate);
    // const mySportsFeedURL = this.generateMySportsFeedURLWithoutCreds({teamCode:"det"}, "20171231");
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

      this.setState({
        isCompleted,
        awayScore,
        homeScore
      });
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
    const isWinnerPaid = await tournamentInstance.methods.isWinnerPaid().call();
    const isLocked = await tournamentInstance.methods.isLocked().call();
    const homeTeamCode = await tournamentInstance.methods.homeTeamCode().call();
    const awayTeamCode = await tournamentInstance.methods.awayTeamCode().call();
    const gameDateTimestamp = await tournamentInstance.methods.gameDate().call();

    let stateParams = {
      homePicker,
      awayPicker,
      wagerWei,
      isWinnerPaid,
      isLocked,
      homeTeam: Teams[homeTeamCode],
      awayTeam: Teams[awayTeamCode],
      gameDate: this.convertUnixTimestampToGameDate(gameDateTimestamp)
    }
    if (wagerWei > 0) {
      stateParams.wagerUSD = this.convertWagerWeiToUSD(wagerWei);
    }
    this.setState(stateParams);
  }

  convertUnixTimestampToGameDate(gameDateTimestamp) {
    return moment.unix(gameDateTimestamp).tz("America/New_York").format("YYYY-MM-DD")
  }

  async createTournament(params) {
    const contract = require('truffle-contract')
    const tournament = contract(TournamentContract)
    tournament.setProvider(this.state.web3.currentProvider);
    
    const account = await this.getCurrentAccount();
    const oracleURL = this.generateOracleURL();
    let instance = await tournament.new(oracleURL, params.isHome, this.state.homeTeam.teamCode, this.state.awayTeam.teamCode, moment(this.state.gameDate).format("X"), {from: account, value: params.wager});
    this.setState({tournamentAddress: instance.address});
    return instance;
  }

  async submitPick(isHome) {
    const wagerInWei = this.getWagerInWei();
    if (this.state.tournamentAddress == null) {
      await this.createTournament({isHome, wager: wagerInWei});
      this.props.history.push("/tournament/" + this.state.tournamentAddress);
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
    return (this.state.wagerUSD / this.state.ETHUSDPrice).toPrecision(4);
  }

  getWagerInWei() {
    return this.state.web3.utils.toWei((this.state.wagerUSD / this.state.ETHUSDPrice).toString(), "ether");
  }

  convertWagerWeiToUSD(wager) {
    return (this.state.web3.utils.fromWei(wager, "ether") * this.state.ETHUSDPrice);
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
    return this.state.isLocked && this.state.isCompleted && !this.state.isWinnerPaid
  }

  async checkForWinner(e) {
    e.preventDefault();
    let account = await this.getCurrentAccount();
    let tournamentInstance = this.getTournamentInstance();
    await tournamentInstance.methods.updateResults().send({from: account});
  }

  getTournamentShareURL() {
    return window.location.protocol + "//" + window.location.host + "/tournament/" + this.state.tournamentAddress;
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
              <h1>{this.state.awayTeam.fullName} (AWAY) at {this.state.homeTeam.fullName} (HOME)</h1>
              <h3>{moment(this.state.gameDate).format("MMMM Do, YYYY")}</h3>
              <br/>
              <p>Set a wager amount.  Bet on one of the teams.  Send the resulting address to a friend.</p>
              
              <form>
                <label>Wager (USD)
                  <input className="wager" style={{width: "60px", "textAlign": "center"}} type="text" value={this.state.wagerUSD.toPrecision(4)} disabled={!this.canSetWager()} onChange={this.handleWagerChange}/><span>{this.getWagerInEth()} Ether</span>
                </label>
                <br/>

                {this.isAwayPickAvailable()
                ? <button className="button-bet" disabled={!this.isAwayPickAvailable()} onClick={(e) => {e.preventDefault(); this.submitPick(false)}}>Bet on the {this.state.awayTeam.fullName}</button>
                : null
                }

                {this.isHomePickAvailable()
                ? <button className="button-bet" disabled={!this.isHomePickAvailable()} onClick={(e) => {e.preventDefault(); this.submitPick(true)}}>Bet on the {this.state.homeTeam.fullName}</button>
                : null
                }
                <br/><br/><br/>

                {this.canCheckForWinner()
                ? <button className="check-for-winner" disabled={!this.canCheckForWinner()} onClick={this.checkForWinner}>Check For Winner</button>
                : null
                }

                {!!this.state.tournamentAddress
                ? [<p key="0" className="share-tournament-text">Save this link! It's how you reference this wager.</p>,
                <p key="1" className="share-tournament-url">{this.getTournamentShareURL()}</p>]
                : null
                }

                <br/><br/><br/>

                <p><b>Instructions</b></p>
                <p>If you're creating a new bet, make sure you keep the resulting url.  Share that with a friend.</p>
                <p>If you're taking the other side of a bet, bet on the other team.</p>
                <p>After the game has ended, a button will appear that validates the score and pays the winner.</p>
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