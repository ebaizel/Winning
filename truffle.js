const PrivateKeyProvider = require("truffle-privatekey-provider");
const privateKey = "771C452DA809F1AC5F3C39D6ACFC50327BDC4B87F1486B7249E47439482A7BCF";

module.exports = {
  networks: {
    ganache: {
      host: "localhost",
      port: 7545,
      network_id: "5777",
      gas:6721975,
    },
    dev: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas:6721975,
    },
    test: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas:6721975,
    },
    truffleDev: {
      host: "localhost",
      port: 9545,
      network_id: "*",
      gas:6721975,
    },
    rinkeby: {
      provider: function() {
        return new PrivateKeyProvider(privateKey, "https://rinkeby.infura.io/v3/0e9b5884b22944928370ffadd59c8079")
      },
      network_id: 3
    }
  },
};
