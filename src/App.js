import React, { Component } from 'react';
import {Helmet} from "react-helmet";
import Router from './Router';

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

class App extends Component {
  render() {
    return (
      <div className="App">
        <Helmet>
          <meta charSet="utf-8" />
          <meta Content-Security-Policy="default-src 'self' *.ngrok.com img-src *" />
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous"/>
          <title>Weiger</title>
        </Helmet>
        <Router/>
      </div>
    );
  }
}

export default App;









// import React, { Component } from 'react'
// import TournamentContract from '../build/contracts/Tournament.json'
// import getWeb3 from './utils/getWeb3'

// import './css/oswald.css'
// import './css/open-sans.css'
// import './css/pure-min.css'
// import './App.css'

// // async function getTxGasConsumption(web3, transactionHash) {
// //   const transaction = await web3.eth.getTransaction(transactionHash);
// //   const txReceipt = await web3.eth.getTransactionReceipt(transactionHash); // contains the actual gas consumed
// //   console.log("transaction is ", transaction);
// //   console.log("txreciept is ", txReceipt);
  
// //   const gasPrice = transaction.gasPrice;
// //   console.log("gas price is ", gasPrice);
// //   return (gasPrice * txReceipt.gasUsed);
// // }

// class App extends Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       storageValue: 0,
//       web3: null
//     }

//     this.checkForWinner = this.checkForWinner.bind(this);
//     this.submitPick = this.submitPick.bind(this);
//   }

//   componentWillMount() {
//     // Get network provider and web3 instance.
//     // See utils/getWeb3 for more info.

//     getWeb3
//     .then(results => {
//       this.setState({
//         web3: results.web3,
//         oracleURL: "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]",
//         tournamentInstance: null,
//         tournamentAddress: "0x03f5cbf1a881081683b4e116dc8a0a6d09bf294b"  // set this from the url if we have it
//       })

//       if (this.state.tournamentAddress != null) {
//         console.log("getting tournament state");
//         return this.getTournamentState()
//       }
//     })
//     .catch(() => {
//       console.log('Error finding web3.')
//     })
//   }

//   getTournamentInstance() {
//     let tournamentInstance = new this.state.web3.eth.Contract(TournamentContract.abi, this.state.tournamentAddress);
//     return tournamentInstance;
//   }

//   // Sets the tournament state in the component
//   async getTournamentState() {
//     let tournamentInstance = this.getTournamentInstance();

//     const awayPicker = await tournamentInstance.methods.awayPicker().call();
//     const wager = await tournamentInstance.methods.wagerAmount().call();
//     const homePicker = await tournamentInstance.methods.homePicker().call();
//     const isCompleted = await tournamentInstance.methods.isCompleted().call();
//     const isWinnerPaid = await tournamentInstance.methods.isWinnerPaid().call();
//     const isLocked = await tournamentInstance.methods.isLocked().call();
//     console.log("is locked is ", isLocked);
//     this.setState({
//       homePicker,
//       awayPicker,
//       wager,
//       isWinnerPaid,
//       isCompleted,
//       isLocked,
//     });
//     console.log("state is ", this.state);
//   }

//   async createTournament(params) {
//     const contract = require('truffle-contract')
//     const tournament = contract(TournamentContract)
//     tournament.setProvider(this.state.web3.currentProvider);
    
//     const account = await this.getCurrentAccount();
//     let instance = await tournament.new(this.state.oracleURL, params.isHome, {from: account, value: params.wagerAmountWei});

//     this.setState({tournamentAddress: instance.address});
//     return instance;
//   }

//   async submitPick(isHome, wagerAmountWei) {
//     if (this.state.tournamentAddress == null) {
//       await this.createTournament({isHome, wagerAmountWei});
//     } else {
//       let tournamentInstance = this.getTournamentInstance();
//       let account = await this.getCurrentAccount();
//       await tournamentInstance.methods.submitEntry(isHome).send({from: account, value: wagerAmountWei});
//     }
//     await this.getTournamentState();
//   }

//   async getAccounts() {
//     return this.state.web3.eth.getAccounts()
//   }

//   async getCurrentAccount() {
//     const accounts = await this.getAccounts();
//     return accounts[0];
//   }

//   canSetWager() {
//     return !this.state.tournamentAddress
//   }

//   isHomePickAvailable() {
//     return (this.state.homePicker === "0x0000000000000000000000000000000000000000")
//   }

//   isAwayPickAvailable() {
//     return (this.state.awayPicker === "0x0000000000000000000000000000000000000000")
//   }

//   handleWagerChange(event) {
//     this.setState({wager: event.target.value});
//   }

//   canCheckForWinner() {
//     return this.state.isLocked && !this.state.isCompleted && !this.state.isWinnerPaid
//   }

//   async checkForWinner() {
//     let tournamentInstance = this.getTournamentInstance();
//     await tournamentInstance.methods.updateResults().call();
//   }

//   render() {
//     return (
//       <div className="App">
//         <nav className="navbar pure-menu pure-menu-horizontal">
//             <a href="#" className="pure-menu-heading pure-menu-link">Weiger</a>
//         </nav>

//         <main className="container">
//           <div className="pure-g">
//             <div className="pure-u-1-1">
//               <h1>NFL Weiger</h1>
//               <h2>Detroit (HOME) vs Green Bay (AWAY)</h2>
//               <p>Pick one of the teams and set a wager.</p>
              
//               <form>
//                 <label>Wager (USD)
//                   <input style={{width: "60px"}} type="text" value={this.state.wager} disabled={!this.canSetWager()} onChange={this.handleWagerChange}/>
//                 </label>
//                 <button disabled={!this.isHomePickAvailable()} onClick={(e) => {e.preventDefault(); this.submitPick(true, 500)}}>Pick Home Team</button>
//                 <button disabled={!this.isAwayPickAvailable()} onClick={(e) => {e.preventDefault(); this.submitPick(false, 500)}}>Pick Away Team</button>
//                 <p>Contract Address: {this.state.tournamentAddress}</p>
//                 <p>Home bettor: {this.state.homePicker}</p>
//                 <p>Away bettor: {this.state.awayPicker}</p>
//                 <button disabled={!this.canCheckForWinner()} onClick={this.checkForWinner}>Check For Winner</button>
//                 <p>{this.state.isLocked}</p>
//                 <p>{this.state.isCompleted}</p>
//                 <p>{this.state.isWinnerPaid}</p>
//               </form>
//             </div>
//           </div>
//         </main>
//       </div>
//     );
//   }
// }

// export default App

//   // async getTournamentInstance(upsert, params) {
//   //   let tournamentInstance = this.state.tournamentInstance;
//   //   console.log("instance is ", tournamentInstance);
//   //   if (tournamentInstance == null && upsert) {
//   //     console.log("creating instance");
//   //     tournamentInstance = await this.createTournament(params);
//   //     console.log("setting instance in state");
//   //     this.setState({tournamentInstance});
//   //   }
//   //   return tournamentInstance;
//   // }

//   // async getTournamentInstance(upsert, params) {
//   //   let tournamentInstance = this.state.tournamentInstance;
//   //   if (tournamentInstance == null && upsert) {
//   //     tournamentInstance = await this.createTournament(params);
//   //     this.setState({tournamentInstance});
//   //   }
//   //   return tournamentInstance;
//   // }

//   // async submitPickAndCreateContract(params) {
//   //   tournamentInstance = await this.createTournament(params);
//   //   console.log("setting instance in state");
//   //   this.setState({tournamentInstance});
//   // }