const hre = require("hardhat");
const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
async function main() {
    let owner;
    let addr1;
    let addr2;
    let addrs;
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    // Fetch the current gas fee data (baseFee and priorityFee)
    const gasData = await ethers.provider.getFeeData();
    let baseFee = gasData.baseFeePerGas;
    // If baseFeePerGas is undefined, set a default value (e.g., 50 Gwei)
    if (!baseFee) {
        console.log("Base fee is undefined, using fallback value of 50 Gwei.");
        baseFee = ethers.parseUnits("50", "gwei"); // Fallback value in case baseFeePerGas is not available
    }
    let  priorityFee = gasData.maxPriorityFeePerGas;
    // If maxPriorityFeePerGas is undefined, set a default value (e.g., 2 Gwei)
    if (!priorityFee) {
        console.log("Priority fee is undefined, using fallback value of 2 Gwei.");
        priorityFee = ethers.parseUnits("2", "gwei"); // Fallback value in case maxPriorityFeePerGas is not available
    }
    // Set maxFeePerGas to be slightly above the baseFee to ensure your transaction gets included
     // Set maxFeePerGas to be slightly above the current baseFee to ensure transaction inclusion
    const maxFeePerGas = baseFee + (ethers.parseUnits("10", "gwei")); // 10 Gwei buffer
    const maxPriorityFeePerGas = priorityFee;
    const CollateralToken = await ethers.getContractFactory("CollateralToken");
    const LoanToken = await ethers.getContractFactory("LoanToken");
    const initialSupply = ethers.parseEther("1000");
    const collateralToken = await CollateralToken.deploy(initialSupply,{
        maxFeePerGas: maxFeePerGas, // Ensure maxFeePerGas is set
        maxPriorityFeePerGas: maxPriorityFeePerGas, // Ensure maxPriorityFeePerGas is set
      });
    const  loanToken = await LoanToken.deploy(initialSupply,{
        maxFeePerGas: maxFeePerGas, // Ensure maxFeePerGas is set
        maxPriorityFeePerGas: maxPriorityFeePerGas, // Ensure maxPriorityFeePerGas is set
      });
    await collateralToken.waitForDeployment();
    await loanToken.waitForDeployment();
    const LendingContract = await ethers.getContractFactory("DecentralizedLendingLoan");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    let priceFeed = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    // Convert to a checksummed address
    priceFeed = ethers.getAddress(priceFeed);
    const lendingContract = await LendingContract.deploy(await collateralToken.getAddress(),await loanToken.getAddress(),priceFeed,{
        maxFeePerGas: maxFeePerGas, // Ensure maxFeePerGas is set
        maxPriorityFeePerGas: maxPriorityFeePerGas, // Ensure maxPriorityFeePerGas is set
      });
    await lendingContract.waitForDeployment();
    console.log("lendingContract deployed at:", await lendingContract.getAddress());
    const lendingContractBis = await ethers.getContractAt("DecentralizedLendingLoan", await lendingContract.getAddress());
    console.log(await lendingContractBis.getLatestPrice());
    await collateralToken.mint(addr1.address, ethers.parseEther("50"));
    await collateralToken.connect(addr1).approve(await lendingContract.getAddress(), ethers.parseEther("50"));
    await lendingContract.connect(addr1).depositCollateral(ethers.parseEther("50"));
    const collateralValue = await lendingContract.connect(addr1).getCollateralValue(addr1.address);
    console.log("collateralValue : ", collateralValue );
     
    const maxBorrowAmount = await lendingContract.connect(addr1).getMaxBorrowAmount(addr1.address);
    console.log("maxBorrowAmount : ", maxBorrowAmount );


//   if (hre.tenderly) {
//     console.log("Verifying contract on Tenderly...");
//     await hre.tenderly.verify({
//       name: "PriceOracle",
//       address: oracle.address,
//     });
//     console.log("Contract verified on Tenderly!");
//   }

  // Deploy a mock AggregatorV3Interface to simulate a Chainlink price feed
  // const MockAggregator = await hre.ethers.getContractFactory("MockAggregator");
  // const mockPriceFeed = await MockAggregator.deploy( 2000 * 10 ** 8,1); // 2000 USD with 8 decimals
  // await mockPriceFeed.waitForDeployment();
  // console.log("mockPriceFeed address : ",await mockPriceFeed.getAddress());
  // Deploy the PriceOracle contract with the mock price feed
  // const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  // const priceOracle = await PriceOracle.deploy(await mockPriceFeed.getAddress());
  // await priceOracle.waitForDeployment();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
