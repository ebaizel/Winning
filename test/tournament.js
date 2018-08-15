var Tournament = artifacts.require("./Tournament.sol");

const WAGER_AMOUNT = 25000000000000000;

// Helper function: calculate the gas consumed for the passed in transaction
async function getTxGasConsumption(transactionHash) {
  const transaction = await web3.eth.getTransaction(transactionHash);
  const txReceipt = await web3.eth.getTransactionReceipt(transactionHash); // contains the actual gas consumed
  const gasPrice = transaction.gasPrice.toNumber();
  return (gasPrice * txReceipt.gasUsed);
}

// Helper function: listen for the PaidWinner event and trigger the passed in callback
function waitForPaidWinnerEvent(instance, cb) {
  const event = instance.PaidWinner();
  event.watch(cb);
}

/**
 * This test verifies that wagers can be placed and there are checks in place to prevent invalid picks, such as picking the same team multiple times, or submitting a wager without enough value
 */
contract('Tournament Entries', function(accounts) {

  let tournamentInstance;
  let start_balance;

  const oracleURL = "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";

  beforeEach("create test contract", async function() {
    // Get the balance before we've placed the wager
    start_balance = web3.eth.getBalance(accounts[1]);

    // Deploy the contract and wager on the home team
    tournamentInstance = await Tournament.new(oracleURL, true, "DET", "GB", 1514592000, {from: accounts[1], value: WAGER_AMOUNT});
  });

  it("should submit an entry", async function() {

    const wager = await tournamentInstance.wagerAmount();
    const totalWager = await tournamentInstance.weiWeigered();
    assert(wager.eq(WAGER_AMOUNT));
    assert(totalWager.eq(WAGER_AMOUNT));

    const homePicker = await tournamentInstance.homePicker();
    assert.equal(homePicker, accounts[1]);
    const isLocked = await tournamentInstance.isLocked();
    assert.equal(isLocked, false);
    
    // Verify the account balance is correct.  Should be less the gas and wager.
    const txGas = await getTxGasConsumption(tournamentInstance.transactionHash);
    const new_balance = await web3.eth.getBalance(accounts[1]);
    assert(start_balance.minus(txGas).minus(WAGER_AMOUNT).eq(new_balance));
  });

  it("should not submit an entry without enough value", function() {
    return tournamentInstance.submitEntry(true, {from: accounts[1], value: 10}
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

/**
 * This test verifies that when the game ends, the winner is paid out
 */
contract('Tournament Winning', function(accounts) {

  let tournamentInstance;
  let startingBalance;

  const oracleURL = "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";

  beforeEach("create test contract", async function() {
    tournamentInstance = await Tournament.new(oracleURL, true, "DET", "GB", 1514592000, {from: accounts[1], value: WAGER_AMOUNT});
  });

  it("should get results and pay the winner", async function() {
    startingBalance = await web3.eth.getBalance(accounts[1]);

    await tournamentInstance.submitEntry(false, {from: accounts[2], value: WAGER_AMOUNT});
    const eventPromise = new Promise(function(resolve, reject) {
      waitForPaidWinnerEvent(tournamentInstance, function(error, result) {
        if (error) {
          return reject(error);
        } else {
          return resolve(result.args);
        }
      })
    });

    const tx = await tournamentInstance.updateResults({from: accounts[1]});
    const gasConsumptionForUpdate = await getTxGasConsumption(tx.tx);

    return eventPromise.then(async result => {
      assert.equal(result.winner, accounts[1]);
      assert(result.amount.eq(WAGER_AMOUNT * 2));
      const newBalance = await web3.eth.getBalance(accounts[1]);
      assert(startingBalance.minus(gasConsumptionForUpdate).plus(WAGER_AMOUNT * 2).eq(newBalance));

      const homeScore = await tournamentInstance.homeTeamScore();
      const awayScore = await tournamentInstance.awayTeamScore();
      const completed = await tournamentInstance.isCompleted();
      assert(homeScore.eq(35));
      assert(awayScore.eq(11));
      assert.equal(completed, true);
      return true;
    }).catch(err => {
      assert(false, "Caught error");
    });
  });

  it("should only get results once", async function() {
    await tournamentInstance.submitEntry(false, {from: accounts[2], value: WAGER_AMOUNT})
    await tournamentInstance.updateResults({from: accounts[1]})
    const paidPromise = new Promise(function(resolve, reject) {
        waitForPaidWinnerEvent(tournamentInstance, function(error, result) {
          if (error) {
            return reject(error);
          } else {
            return resolve(result.args);
          }
        })
      });
    return paidPromise.then(() => {
      return tournamentInstance.updateResults({from: accounts[1]})
    }).catch(assert);
  });
});

/**
 * This test verifies that when the game results in a tie, both participants are paid out
 */
contract('Tie Game', function(accounts) {

  let tournamentInstance;

  const oracleURL = "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2016-2017-regular/games.json?team=was&date=20161030).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";

  beforeEach("create test contract", async function() {
    tournamentInstance = await Tournament.new(oracleURL, true, "CIN", "WAS", 1477699200, {from: accounts[1], value: WAGER_AMOUNT});
  });

  it("should get results and pay both winners", async function() {

    await tournamentInstance.submitEntry(false, {from: accounts[2], value: WAGER_AMOUNT})
    const startingBalance1 = await web3.eth.getBalance(accounts[1]);
    const startingBalance2 = await web3.eth.getBalance(accounts[2]);
    const tx = await tournamentInstance.updateResults({from: accounts[1]})
    const gasConsumptionForUpdate = await getTxGasConsumption(tx.tx);
    return new Promise(function(resolve, reject) {
      waitForPaidWinnerEvent(tournamentInstance, function(error, result) {
        if (error) {
          return reject(error);
        } else {
          return resolve(result.args);
        }
      })
    }).then(async () => {
      let newBalance = await web3.eth.getBalance(accounts[1])
      assert(startingBalance1.plus(WAGER_AMOUNT).minus(gasConsumptionForUpdate).eq(newBalance));
      newBalance = await web3.eth.getBalance(accounts[2])
      assert(startingBalance2.plus(WAGER_AMOUNT).eq(newBalance));
    });
  });
});

/**
 * This test verifies that when the kill switch is triggered, it refunds the wagers to the participants
 */
contract('Tournament kill switch', function(accounts) {

  let tournamentInstance;

  const oracleURL = "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";

  beforeEach("create test contract", async function() {
    // Deploy the contract and wager on the home team
    tournamentInstance = await Tournament.new(oracleURL, true, "DET", "GB", 1514592000, {from: accounts[1], value: WAGER_AMOUNT});
  });

  it("should refund wagers to both participants", async function() {
    // Get the balance before we've refunded the wagers
    let start_balance_1 = await web3.eth.getBalance(accounts[1]);
    await tournamentInstance.submitEntry(false, {from: accounts[2], value: WAGER_AMOUNT});
    let post_wager_balance_2 = await web3.eth.getBalance(accounts[2]);
    const tx_kill = await tournamentInstance.kill({from: accounts[1]});
    const gas_kill = await getTxGasConsumption(tx_kill.receipt.transactionHash);

    // Get the balances after the payouts
    let updated_balance_1 = await web3.eth.getBalance(accounts[1]);
    let updated_balance_2 = await web3.eth.getBalance(accounts[2]);
    let contract_balance = await web3.eth.getBalance(tournamentInstance.address);

    // Assert the balances have the WAGER_AMOUNT returned to them
    assert(post_wager_balance_2.plus(WAGER_AMOUNT).eq(updated_balance_2));
    assert(start_balance_1.minus(gas_kill).plus(WAGER_AMOUNT).eq(updated_balance_1));

    // Assert that the contract has a zero balance remaining
    assert(contract_balance.eq(0));
  });
});