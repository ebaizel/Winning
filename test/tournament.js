var Tournament = artifacts.require("./Tournament.sol");

const WAGER_AMOUNT = 23273675146042310;
const STARTING_BALANCE = 100000000000000000000;
const entryData = {
  ipfsHash: "ipfsHash",
  name: "Arnold"
}

const entryData2 = {
  ipfsHash: "ipfsHash2",
  name: "Annie"
}

contract('Tournament Entries', function(accounts) {

  it("should submit an entry", function() {
    return Tournament.deployed().then(function(instance) {
      tournamentInstance = instance;
      return tournamentInstance.submitEntry(entryData.ipfsHash, entryData.name, {from: accounts[0], value: WAGER_AMOUNT});
    }).then(function() {
      return tournamentInstance.entries(accounts[0])
    }).then(function(storedData) {
      assert.equal(storedData[0], entryData.ipfsHash);
      assert.equal(storedData[1], entryData.name);
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

  it("should set and get the winner", function() {
    return Tournament.deployed().then(function(instance) {
      tournamentInstance = instance;
      return tournamentInstance.submitEntry(entryData.ipfsHash, entryData.name, {from: accounts[1], value: WAGER_AMOUNT});
    }).then(function() {
      return tournamentInstance.submitEntry(entryData2.ipfsHash, entryData2.name, {from: accounts[2], value: WAGER_AMOUNT});
    }).then(function() {
      tournamentInstance.setWinner(accounts[1], {from: accounts[0]})
    }).then(async function() {
      let winner = await tournamentInstance.getWinner()
      assert.equal(winner[0], accounts[1]);
      assert.equal(winner[1], entryData.name);
    });
  });

  it("should allow the winner to withdraw", function() {
    return Tournament.deployed().then(function(tournamentInstance) {
      tournamentInstance.withdraw({from: accounts[1]})
    }).then(async function() {
      const balance = await web3.eth.getBalance(accounts[1])
      console.log(balance.toString(10));
      assert.equal(balance.toString(10), (STARTING_BALANCE + WAGER_AMOUNT).toString(10));
      const balance4 = await web3.eth.getBalance(accounts[4])
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
