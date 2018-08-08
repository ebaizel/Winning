var Tournament = artifacts.require("./Tournament.sol");

const WAGER_AMOUNT = 25000000000000000;
const STARTING_BALANCE = 100000000000000000000;

// Calculate the gas consumed for the passed in transaction
function getTxGasConsumption(transaction) {
  const txReceipt = transaction.receipt;  // contains the actual gas consumed
  const txFull = web3.eth.getTransaction(transaction.tx);  // contains the actual gas price
  const gasPrice = txFull.gasPrice.toNumber();
  return (gasPrice * txReceipt.gasUsed);
}

contract('Tournament Entries', function(accounts) {

  let tournamentInstance;

  const oracleURL = "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";

  beforeEach("create test contract", async function() {
    tournamentInstance = await Tournament.new(oracleURL, {value: web3.toWei(1, 'ether')});
  });

  it("should submit an entry", function() {
    let txSummary;
    let start_balance;

    // Get the balance before we've placed the wager
    start_balance = web3.eth.getBalance(accounts[1]);

    // Wager on the home team
    return tournamentInstance.submitEntry(true, {from: accounts[1], value: WAGER_AMOUNT}
    ).then(async function(tx) {
      txSummary = tx;
      return tournamentInstance.homePicker()
    }).then(async function(homePicker) {
      assert.equal(homePicker, accounts[1]);
      return tournamentInstance.isLocked()
    }).then(async function(isLocked) {
      assert.equal(isLocked, false);
      
      // Verify the account balance is correct.  Should be less the gas and wager.
      const txGas = getTxGasConsumption(txSummary);
      const new_balance = await web3.eth.getBalance(accounts[1]);
      assert.equal((start_balance - txGas - WAGER_AMOUNT), new_balance.toNumber());
    });
  });

  it("should not submit an entry without enough value", function() {
    return tournamentInstance.submitEntry(true, {from: accounts[0], value: 10}
    ).then(function() {
      assert.equal(false, "Bet should have been rejected for low funds");
    }).catch(assert);
  });

  it("should not allow selecting an already selected team", function() {
    return tournamentInstance.submitEntry(true, {from: accounts[1], value: WAGER_AMOUNT}
    ).then( () => {
      return tournamentInstance.submitEntry(true, {from: accounts[2], value: WAGER_AMOUNT})
    }).catch(assert);
  });
});

contract('Tournament Winning', function(accounts) {

  function waitForPaidWinnerEvent(instance, cb) {
    const event = instance.PaidWinner();
    event.watch(cb);
  }

  let tournamentInstance;

  const oracleURL = "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";

  beforeEach("create test contract", async function() {
    tournamentInstance = await Tournament.new(oracleURL, {value: web3.toWei(1, 'ether')});
  });

  it("should get results and pay the winner", async function() {
    
    let startingBalance;
    
    return tournamentInstance.submitEntry(true, {from: accounts[1], value: WAGER_AMOUNT}
    ).then( async () => {
      startingBalance = await web3.eth.getBalance(accounts[1]);
      return tournamentInstance.submitEntry(false, {from: accounts[2], value: WAGER_AMOUNT})
    }).then( () => {
      return tournamentInstance.updateResults({from: accounts[0]})
    }).then(async () => {
      return new Promise(function(resolve, reject) {
        waitForPaidWinnerEvent(tournamentInstance, function(error, result) {
          if (error) {
            return reject(error);
          } else {
            return resolve(result.args);
          }
        })
      })
    }).then(result => {
      assert.equal(result.winner, accounts[1]);
      assert.equal(result.amount.toNumber(), WAGER_AMOUNT * 2);
      return web3.eth.getBalance(accounts[1])
    }).then(newBalance => {
      assert.equal(startingBalance.toNumber() + WAGER_AMOUNT * 2, newBalance.toNumber());
    });
  });

  it("should only get results once", function() {
    return tournamentInstance.submitEntry(true, {from: accounts[1], value: WAGER_AMOUNT}
    ).then( () => {
      return tournamentInstance.submitEntry(false, {from: accounts[2], value: WAGER_AMOUNT})
    }).then( () => {
      return tournamentInstance.updateResults({from: accounts[0]})
    }).then(async () => {
      return new Promise(function(resolve, reject) {
        waitForPaidWinnerEvent(tournamentInstance, function(error, result) {
          if (error) {
            return reject(error);
          } else {
            return resolve(result.args);
          }
        })
      })
    }).then( () => {
      return tournamentInstance.updateResults({from: accounts[0]})
    }).catch(assert);
  });

});

contract('Tie Game', function(accounts) {

  function waitForPaidWinnerEvent(instance, cb) {
    const event = instance.PaidWinner();
    event.watch(cb);
  }

  let tournamentInstance;

  const oracleURL = "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2016-2017-regular/games.json?team=was&date=20161030).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";

  beforeEach("create test contract", async function() {
    tournamentInstance = await Tournament.new(oracleURL, {value: web3.toWei(1, 'ether')});
  });

  it("should get results and pay both winners", async function() {
    
    let startingBalance1, startingBalance2;
    
    return tournamentInstance.submitEntry(true, {from: accounts[1], value: WAGER_AMOUNT}
    ).then( () => {
      return tournamentInstance.submitEntry(false, {from: accounts[2], value: WAGER_AMOUNT})
    }).then( async () => {
      startingBalance1 = await web3.eth.getBalance(accounts[1]);
      startingBalance2 = await web3.eth.getBalance(accounts[2]);
      return tournamentInstance.updateResults({from: accounts[0]})
    }).then(async () => {
      return new Promise(function(resolve, reject) {
        waitForPaidWinnerEvent(tournamentInstance, function(error, result) {
          if (error) {
            return reject(error);
          } else {
            return resolve(result.args);
          }
        })
      })
    }).then( () => {
      return web3.eth.getBalance(accounts[1])
    }).then(newBalance => {
      assert.equal(startingBalance1.toNumber() + WAGER_AMOUNT, newBalance.toNumber());
      return web3.eth.getBalance(accounts[2])
    }).then(newBalance => {
      assert.equal(startingBalance2.toNumber() + WAGER_AMOUNT, newBalance.toNumber());
    });
  });

});