var Tournament = artifacts.require("./Tournament.sol");
var JSMN = artifacts.require("jsmnsol-lib/JsmnSolLib.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(JSMN, {overwrite: false}).then(function() {
    deployer.deploy(Tournament,"someurl", true)
  }).catch(err => {
    console.log("Caught err deploying ", err);
  });
};
