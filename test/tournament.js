var Tournament = artifacts.require("./Tournament.sol");

const WAGER_AMOUNT = 25000000000000000;
const STARTING_BALANCE = 100000000000000000000;

const entryData = {
  ipfsHash: "ipfsHash",
  name: "Arnold"
}

const entryData2 = {
  ipfsHash: "ipfsHash2",
  name: "Annie"
}

// Calculate the gas consumed for the passed in transaction
function getTxGasConsumption(transaction) {
  const txReceipt = transaction.receipt;  // contains the actual gas consumed
  const txFull = web3.eth.getTransaction(transaction.tx);  // contains the actual gas price
  const gasPrice = txFull.gasPrice.toNumber();
  return (gasPrice * txReceipt.gasUsed);
}

contract('Tournament Entries', function(accounts) {

  it("should submit an entry", function() {
    let txSummary;
    let tournamentInstance; // the instance of the tournament smart contract
    let start_balance;

    return Tournament.deployed().then(function(instance) {
      tournamentInstance = instance;
      // Get the balance before we've placed the wager
      start_balance = web3.eth.getBalance(accounts[1]);
      return tournamentInstance.submitEntry(entryData.ipfsHash, entryData.name, {from: accounts[1], value: WAGER_AMOUNT});
    }).then(async function(tx) {
      txSummary = tx;
      return tournamentInstance.entries(accounts[1])
    }).then(async function(storedData) {
      assert.equal(storedData[0], entryData.ipfsHash);
      assert.equal(storedData[1], entryData.name);
      
      // Verify the account balance is correct.  Should be less the gas and wager.
      const txGas = getTxGasConsumption(txSummary);
      const new_balance = await web3.eth.getBalance(accounts[1]);
      assert.equal((start_balance - txGas - WAGER_AMOUNT), new_balance.toNumber());
    });
  });

  it("should not submit an entry without enough value", function() {
    return Tournament.deployed().then(function(instance) {
      tournamentInstance = instance;
      return tournamentInstance.submitEntry(entryData.ipfsHash, entryData.name, {from: accounts[0], value: 10});
    }).then(function() {
      assert.equal(false, "Bet should have been rejected for low funds");
    }).catch(assert);
  });
});

contract('Tournament Winning', function(accounts) {

  let start_balance_1 = web3.eth.getBalance(accounts[1]);
  let start_balance_2 = web3.eth.getBalance(accounts[2]);
  let gas_tx_1, gas_tx_2;

  it("should set and get the winner", function() {
    return Tournament.deployed().then(function(instance) {
      tournamentInstance = instance;
      return tournamentInstance.submitEntry(entryData.ipfsHash, entryData.name, {from: accounts[1], value: WAGER_AMOUNT});
    }).then(function(tx1) {
      gas_tx_1 = getTxGasConsumption(tx1);
      return tournamentInstance.submitEntry(entryData2.ipfsHash, entryData2.name, {from: accounts[2], value: WAGER_AMOUNT});
    }).then(function(tx2) {
      gas_tx_2 = getTxGasConsumption(tx2);
      return tournamentInstance.setWinner(accounts[1], {from: accounts[0]})
    }).then(async function() {
      let winner = await tournamentInstance.getWinner()
      assert.equal(winner[0], accounts[1]);
      assert.equal(winner[1], entryData.name);
    });
  });

  it("should allow the winner to withdraw", function() {
    return Tournament.deployed().then(function(tournamentInstance) {
      return tournamentInstance.withdraw({from: accounts[1]})
    }).then(async function(tx_withdraw) {
      const balance_winner = await web3.eth.getBalance(accounts[1]);
      const gas_withdraw_tx = getTxGasConsumption(tx_withdraw);
      assert.equal(start_balance_1.minus(gas_tx_1).minus(gas_withdraw_tx).minus(WAGER_AMOUNT).plus(WAGER_AMOUNT * 2).toNumber(), balance_winner.toNumber());
    });
  });
});

contract('Tournament Winning Restrictions', function(accounts) {

  it("should not allow non-owner to set the winner", function() {
    return Tournament.deployed().then(function(instance) {
      tournamentInstance = instance;
      return tournamentInstance.submitEntry(entryData.ipfsHash, entryData.name, {from: accounts[1], value: WAGER_AMOUNT});
    }).then(function() {
      tournamentInstance.setWinner(accounts[1], {from: accounts[1]})
    }).catch(assert);
  });

});
