import React from 'react';
import moment from 'moment-timezone';
import queryString from "stringquery";

import TournamentContract from '../../build/contracts/Tournament.json';
import getWeb3 from '../utils/getWeb3';
import Teams from "../lib/teams";
import getCoinPrice from "../lib/coinPrice";

const GITHUB_PAGE_HOST = "ebaizel.github.io";
const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

class Tournament extends React.Component {
  constructor(props) {
    super(props);

    let tournamentAddress = props.match.params.tournamentAddress;
    const queryParams = queryString(props.location.search);

    this.state = {
      web3: null,
      tournamentAddress: tournamentAddress,
      queryParams: queryParams,
      tournamentInstance: null, //TODO: can probably remove this
      homePicker: EMPTY_ADDRESS,
      awayPicker: EMPTY_ADDRESS,
      isCompleted: false,
      isLocked: false,
      isWinnerPaid: false,
      wagerUSD: 10,
      ETHUSDPrice: 300, // will update on load
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

  generateMySportsFeedURLWithoutCreds(homeTeam, gameDate, season) {
    let myapiURL = "https://api.mysportsfeeds.com/v2.0/pull/nfl/__season__/games.json?team=__team__&date=__date__";
    gameDate = gameDate.replace(/-/g, ''); //convert 2018-09-10 to 20180910
    myapiURL = myapiURL.replace("__team__", homeTeam.teamCode.toLowerCase()).replace("__date__", gameDate).replace("__season__", season);
    return myapiURL;
  }

  generateMySportsFeedURL(homeTeam, gameDate, season) {
    let myapiURL = "https://__username__:__password__@api.mysportsfeeds.com/v2.0/pull/nfl/__season__/games.json?team=__team__&date=__date__";
    gameDate = gameDate.replace(/-/g, ''); //convert 2018-09-10 to 20180910
    myapiURL = myapiURL.replace("__username__", this.state.mySportsFeedUser).replace("__password__",this.state.mySportsFeedPassword).replace("__team__", homeTeam.teamCode.toLowerCase()).replace("__date__", gameDate).replace("__season__", season);
    return myapiURL;
  }

  generateOracleURL() {
    const season = this.getSeason(this.state.homeTeam, this.state.gameDate);
    let mySportsFeedURL = this.generateMySportsFeedURL(this.state.homeTeam, this.state.gameDate, season);
    let oracleURL = "json(__mysportsfeedurl__).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";
    oracleURL = oracleURL.replace("__mysportsfeedurl__", mySportsFeedURL);
    return oracleURL;
  }

  componentWillMount() {
    this.getTournamentShareURL()
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
          gameDate
        });
      }
    })
    .catch((err) => {
      console.log('Error finding web3.', err)
    })
  }

  /**
    * For testing/demo purposes, we set the season to 2017 so we can run through a completed game
    */
  getSeason(homeTeam, gameDate) {
    if ( ((homeTeam.teamCode === "det") || (homeTeam.teamCode === "DET"))  && (gameDate === "2017-12-31")) {
      return("2017-2018-regular");
    }
    return("2018-2019-regular");
  }

  async getRealWorldGameState(homeTeam, gameDate) {
    const season = this.getSeason(homeTeam, gameDate);
    const mySportsFeedURL = this.generateMySportsFeedURLWithoutCreds(homeTeam, gameDate, season);
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
    await this.watchEvents();

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

  async watchEvents() {
    const contract = require('truffle-contract');
    const tournament = contract(TournamentContract);
    tournament.setProvider(this.state.web3.currentProvider);

    let instance = await tournament.at(this.state.tournamentAddress);

    let TeamSelectedEvent = instance.TeamSelected({});
    TeamSelectedEvent.watch((err, result) => {
      const eventArgs = result.args;
      let updateArgs = {};
      if (eventArgs.message === "Away") {
        updateArgs = this.state.homePicker !== EMPTY_ADDRESS ? {awayPicker: eventArgs.picker, isLocked: true}: {awayPicker: eventArgs.picker};
        if (this.state.pickSubmissionPending && !this.state.pickSubmissionIsHome) {
          updateArgs = Object.assign(updateArgs, {pickSubmissionPending: false});
        }
      } else {
        updateArgs = this.state.awayPicker !== EMPTY_ADDRESS ? {homePicker: eventArgs.picker, isLocked: true}: {homePicker: eventArgs.picker};
        if (this.state.pickSubmissionPending && this.state.pickSubmissionIsHome) {
          updateArgs = Object.assign(updateArgs, {pickSubmissionPending: false});
        }
      }

      this.setState(updateArgs);
    });

    let WinnerPaidEvent = instance.PaidWinner({});
    WinnerPaidEvent.watch((err, result) => {
      this.setState({isWinnerPaid: true});
    });
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
    await this.watchEvents();
    return instance;
  }

  async submitPick(isHome) {
    const wagerInWei = this.getWagerInWei();
    this.setState({pickSubmissionPending: true, pickSubmissionIsHome: isHome});
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
    let host = window.location.host;
    let shareURL =  window.location.protocol + "//" + host;
    if (host === GITHUB_PAGE_HOST) {
      shareURL += "/Winning";
    }
    shareURL += "/#/tournament/" + this.state.tournamentAddress;
    return shareURL;
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
              <p>Set a wager amount.  Bet on one of the teams.  Send the bet to a friend to bet on the other team.</p>
              
              <form>
                <label>Wager (USD)
                  <input className="wager" style={{width: "60px", "textAlign": "center"}} type="text" value={this.state.wagerUSD} disabled={!this.canSetWager()} onChange={this.handleWagerChange}/><span>{this.getWagerInEth()} Ether</span>
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
                <br/>
                {this.state.pickSubmissionPending
                ? <p className="share-tournament-text">Pick submittal is pending...this can take up to a couple minutes.</p>
                : null
                }
                <br/><br/>

                {this.canCheckForWinner()
                ? <button className="check-for-winner" disabled={!this.canCheckForWinner()} onClick={this.checkForWinner}>Check For Winner</button>
                : null
                }

                {this.state.isLocked && !this.state.isWinnerPaid
                  ? <p className="check-for-winner-text">Once the game has ended, come back and complete this wager.</p>
                  : null
                }

                {this.state.isWinnerPaid
                  ? <p className="check-for-winner-text">This wager has completed and the winner has been paid.  Congrats!</p>
                  : null
                }

                {!!this.state.tournamentAddress
                ? [<p key="0" className="share-tournament-text">Save this link! It's how you reference this wager.</p>,
                <p key="1" className="share-tournament-url">{this.getTournamentShareURL()}</p>]
                : null
                }

                <br/><br/><br/>

                <p><b>Instructions</b></p>
                <p>You'll need to install <a href="https://metamask.io/">MetaMask</a> in order to play</p>
                <p>If you're creating a new bet, make sure you keep the resulting url.  Share that with a friend.</p>
                <p>If you're taking the other side of a bet, bet on the other team.</p>
                <p>After the game has ended, return to this page to complete the wager.  The smart contract will execute and automatically payout the winner.</p>
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