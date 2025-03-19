require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("hardhat-deploy");

const  dotenv = require("dotenv");
//const tenderly = require("@tenderly/hardhat-tenderly");
dotenv.config();

//tenderly.setup({ automaticVerifications: true });
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  gasReporter: {
    enabled: true, // Enables reporting
    currency: "ETH", // Shows gas costs in USD
    //gasPrice: 20, // Estimated gas price in Gwei
    //coinmarketcap: "YOUR_API_KEY", // Optional: Get live ETH prices
    //outputFile: "gas-report.json", // Optional: Save report to a file
    //noColors: false, // Use colors in the console output
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
    deployments: "./deployments",
  },
  
  networks: {
    // virtual_mainnet: {
    //   url: process.env.MY_TENDERLY_KEY,
    //   chainId: 1,
    //   currency: "VETH"
    // },
    hardhat: {
      forking: {
        url: process.env.INFURA_API_KEY,
        blockNumber: 18000000, // (optional) specify a block for consistency
      },
     // Set appropriate gas fees for the forked network
     gasPrice: 50000000000, // 50 Gwei (may not work with forked mainnet)
     // EIP-1559 Gas Fees
     gas: 2100000, // Optional: Gas limit for each transaction
     maxFeePerGas: 100 * 10**9, // 100 Gwei (in Wei)
     maxPriorityFeePerGas: 2 * 10**9, // 2 Gwei (in Wei)
     
   
    },
    // localhost: {
    //   url: "http://127.0.0.1:8545",
    //   chainId: 31337,  // Ensure this matches your Hardhat network
    // },
  },
  // tenderly: {
  //   // https://docs.tenderly.co/account/projects/account-project-slug
  //   project: "project",
  //   username: "aizen007",
  //   accessKey: process.env.ACCESSKEY,
  //   automaticVerifications: true,
  // },
};
