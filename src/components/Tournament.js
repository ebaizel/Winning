import React, { Component } from 'react'
import TournamentContract from '../../build/contracts/Tournament.json'
import getWeb3 from '../utils/getWeb3'

// async function getTxGasConsumption(web3, transactionHash) {
//   const transaction = await web3.eth.getTransaction(transactionHash);
//   const txReceipt = await web3.eth.getTransactionReceipt(transactionHash); // contains the actual gas consumed
//   console.log("transaction is ", transaction);
//   console.log("txreciept is ", txReceipt);
  
//   const gasPrice = transaction.gasPrice;
//   console.log("gas price is ", gasPrice);
//   return (gasPrice * txReceipt.gasUsed);
// }

class Tournament extends Component {
  constructor(props) {
    super(props)

    this.state = {
      web3: null,
      tournamentAddress: props.match.params.tournamentAddress, // "0x03f5cbf1a881081683b4e116dc8a0a6d09bf294b",
      tournamentInstance: null,
      homePicker: "0x0000000000000000000000000000000000000000",
      awayPicker: "0x0000000000000000000000000000000000000000",
      isCompleted: false,
      isLocked: false,
      isWinnerPaid: false,
      wagerUSD: 0
    }

    this.checkForWinner = this.checkForWinner.bind(this);
    this.submitPick = this.submitPick.bind(this);
    this.handleWagerChange = this.handleWagerChange.bind(this);
  }

  componentWillMount() {  
    getWeb3.then(results => {
      this.setState({
        web3: results.web3,
        oracleURL: "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]",
      })

      if (this.state.tournamentAddress != null) {
        return this.getTournamentState()
      }
    })
    .catch((err) => {
      console.log('Error finding web3.', err)
    })
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

    let stateParams = {
      homePicker,
      awayPicker,
      wagerWei,
      isWinnerPaid,
      isCompleted,
      isLocked
    }
    if (wagerWei > 0) {
      stateParams.wagerUSD = this.convertWagerWeiToUSD(wagerWei);
    }
    this.setState(stateParams);
    console.log("this state is ", this.state);
  }

  async createTournament(params) {
    const contract = require('truffle-contract')
    const tournament = contract(TournamentContract)
    tournament.setProvider(this.state.web3.currentProvider);
    
    const account = await this.getCurrentAccount();
    let instance = await tournament.new(this.state.oracleURL, params.isHome, {from: account, value: params.wager});

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
    this.setState({wager: event.target.value});
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
            <a href="#" className="pure-menu-heading pure-menu-link">NFL Weiger</a>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>Detroit (HOME) vs Green Bay (AWAY)</h1>
              <h3>December 31, 2017</h3>
              <p>Pick one of the teams and set a wager.</p>
              
              <form>
                <label>Wager (USD)
                  <input style={{width: "60px", "textAlign": "center"}} type="text" value={this.state.wagerUSD} disabled={!this.canSetWager()} onChange={this.handleWagerChange}/><span>{this.getWagerInEth()} Ether</span>
                </label>
                <br/>
                <button disabled={!this.isHomePickAvailable()} onClick={(e) => {e.preventDefault(); this.submitPick(true)}}>Pick Home Team</button>
                <button disabled={!this.isAwayPickAvailable()} onClick={(e) => {e.preventDefault(); this.submitPick(false)}}>Pick Away Team</button>
                <br/><br/><br/>

                <p>Contract Info</p>
                <p>Contract Address: {this.state.tournamentAddress}</p>
                <p>Home bettor: {this.state.homePicker}</p>
                <p>Away bettor: {this.state.awayPicker}</p>
                <button disabled={!this.canCheckForWinner()} onClick={this.checkForWinner}>Check For Winner</button>
                <p>{this.state.isLocked}</p>
                <p>{this.state.isCompleted}</p>
                <p>{this.state.isWinnerPaid}</p>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default Tournament