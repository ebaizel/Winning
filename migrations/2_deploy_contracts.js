var Tournament = artifacts.require("./Tournament.sol");
var OraclizeTest = artifacts.require("./OraclizeTest.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Tournament,"some")
  .then(instance => {
    deployer.deploy(
      OraclizeTest,
      { from: accounts[9], gas:6721975, value: 500000000000000000 });
  })
};
