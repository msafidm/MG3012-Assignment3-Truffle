/**
 * truffle-config.js
 * Connects Truffle to the local Ganache blockchain.
 * Ganache GUI default: http://127.0.0.1:7545 (chainId 1337)
 */
module.exports = {
  networks: {
    // Used by: truffle migrate   (same as --network development)
    development: {
      host: "127.0.0.1",   // Ganache address
      port: 7545,          // Ganache GUI port (use 8545 for the `ganache` CLI default)
      network_id: "*",     // match any network id
    },
  },

  compilers: {
    solc: {
      version: "0.8.21",   // matches pragma ^0.8.20 (Truffle downloads it once, needs internet)
      settings: {
        optimizer: { enabled: false, runs: 200 },
        evmVersion: "paris", // safe for Ganache
      },
    },
  },
};
