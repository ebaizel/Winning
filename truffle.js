module.exports = {
  networks: {
    ganache: {
      host: "localhost",
      port: 7545,
      network_id: "5777",
      gas:500000,
    },
    dev: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas:500000,
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
  },
};
