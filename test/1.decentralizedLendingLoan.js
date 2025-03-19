const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DecentralizedLendingLoan", function () {
  let LendingContract;
  let lendingContract;
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let collateralToken;
  let loanToken;
  let lendingContractBis;
  let collateralTokenBis;
  let loanTokenBis;
  beforeEach(async function () {
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
    
     //collateralTokenBis = await CollateralToken.deploy(initialSupply);
      collateralTokenBis = await CollateralToken.deploy(initialSupply,{
      maxFeePerGas: maxFeePerGas, // Ensure maxFeePerGas is set
      maxPriorityFeePerGas: maxPriorityFeePerGas, // Ensure maxPriorityFeePerGas is set
    });
     //loanTokenBis = await LoanToken.deploy(initialSupply);
     loanTokenBis = await LoanToken.deploy(initialSupply,{
      maxFeePerGas: maxFeePerGas, // Ensure maxFeePerGas is set
      maxPriorityFeePerGas: maxPriorityFeePerGas, // Ensure maxPriorityFeePerGas is set
    });
     
    await collateralTokenBis.waitForDeployment();
    await loanTokenBis.waitForDeployment();
    collateralToken = await ethers.getContractAt("CollateralToken", await collateralTokenBis.getAddress());
    loanToken = await ethers.getContractAt("LoanToken", await loanTokenBis.getAddress());

    console.log("collateralToken : ",await collateralToken.getAddress());
    console.log("loanToken :",await loanToken.getAddress());
     LendingContract = await ethers.getContractFactory("DecentralizedLendingLoan");
    
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
     //lendingContractBis = await LendingContract.deploy(await collateralToken.getAddress(),await loanToken.getAddress());
     let priceFeed = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    // Convert to a checksummed address
    priceFeed = ethers.getAddress(priceFeed);
    lendingContractBis = await LendingContract.deploy(await collateralToken.getAddress(),await loanToken.getAddress(),priceFeed,{
        maxFeePerGas: maxFeePerGas, // Ensure maxFeePerGas is set
        maxPriorityFeePerGas: maxPriorityFeePerGas, // Ensure maxPriorityFeePerGas is set
      });
    
    await lendingContractBis.waitForDeployment();
    lendingContract = await ethers.getContractAt("DecentralizedLendingLoan", await lendingContractBis.getAddress());
  });

  it("Should deploy successfully", async function () {
    //lendingContract = await ethers.getContractAt("DecentralizedLendingLoan", await lendingContractBis.getAddress());
    expect(await lendingContract.getAddress()).to.properAddress;
  });

  it("Should allow a user to deposit liquidity", async function () {
    await loanToken.mint(addr1.address, ethers.parseEther("1000"));
    await loanToken.connect(addr1).approve(await lendingContract.getAddress(), ethers.parseEther("100"));

    await expect(await lendingContract.connect(addr1).depositLiquidity(ethers.parseEther("100")))
      .to.emit(lendingContract, "LiquidityDeposited")
      .withArgs(addr1.address, ethers.parseEther("100"));
  });

  it("Should allow a user to deposit collateral", async function () {
    await collateralToken.mint(addr1.address, ethers.parseEther("50"));
    await collateralToken.connect(addr1).approve(await lendingContract.getAddress(), ethers.parseEther("50"));
    await expect(lendingContract.connect(addr1).depositCollateral(ethers.parseEther("50")))
      .to.emit(lendingContract, "CollateralDeposited")
      .withArgs(addr1.address, ethers.parseEther("50"));
  });

  it("Should allow a user to take a loan", async function () {
    await collateralToken.mint(addr1.address, ethers.parseEther("150"));
    await collateralToken.connect(addr1).approve(await lendingContract.getAddress(), ethers.parseEther("150"));
    await lendingContract.connect(addr1).depositCollateral(ethers.parseEther("150"));
    await loanToken.mint(addr1.address, ethers.parseEther("500"));
    await loanToken.connect(addr1).approve(await lendingContract.getAddress(), ethers.parseEther("500"));
    await lendingContract.connect(addr1).depositLiquidity(ethers.parseEther("500"));
    await expect(lendingContract.connect(addr1).takeLoan(ethers.parseEther("1"), 30 * 86400))
      .to.emit(lendingContract, "LoanTaken")
      .withArgs(addr1.address, ethers.parseEther("1"));
  });

  it("Should allow a user to repay the loan", async function () {
    await collateralToken.mint(addr1.address, ethers.parseEther("150"));
    await collateralToken.connect(addr1).approve(await lendingContract.getAddress(), ethers.parseEther("150"));
    await lendingContract.connect(addr1).depositCollateral(ethers.parseEther("150"));
    await loanToken.mint(addr1.address, ethers.parseEther("500"));
    await loanToken.connect(addr1).approve(await lendingContract.getAddress(), ethers.parseEther("500"));
    await lendingContract.connect(addr1).depositLiquidity(ethers.parseEther("500"));
    const loan = "1" ;
    console.log("loan : ",ethers.parseEther(loan));
    await lendingContract.connect(addr1).takeLoan(ethers.parseEther(loan), 30 * 86400);
    //await network.provider.send("evm_increaseTime", [400]);
    const totalLoaned = await lendingContract.totalLoaned();
     console.log("totalLoaned : ",totalLoaned.toString());
     await lendingContract.connect(addr1).getCalculatedInterest(addr1.address);
     let interest = await lendingContract.connect(addr1).calculatedInterest();
     console.log("interest : ",interest.toString());
     let bufferPercentage = 5;

    

    const amountLoan = ethers.parseEther(loan) + interest;
    console.log("interest : ",interest.toString());
    console.log("amountLoan : ",amountLoan.toString());
    // Apply the buffer to adjust expected value
    let bufferValue = (amountLoan * BigInt(bufferPercentage)) / 1000000000n ;
    console.log("bufferPercentage : ",bufferPercentage);
    let adjustedValue = amountLoan + bufferValue; // Adjusted value with buffer
    console.log("adjustedValue : ",adjustedValue);
    console.log("bufferValue : ",bufferValue);
    await loanToken.mint(addr1.address, BigInt(adjustedValue)); // Including interest
    await loanToken.connect(addr1).approve(await lendingContract.getAddress(), BigInt(adjustedValue));

    await expect(lendingContract.connect(addr1).repayLoan(BigInt(adjustedValue)))
      .to.emit(lendingContract, "LoanRepaid")
      .withArgs(addr1.address, BigInt(adjustedValue.toString()));

       
     
  });

  it("Should allow a user to withdraw liquidity", async function () {
    await loanToken.mint(addr1.address, ethers.parseEther("500"));
    await loanToken.connect(addr1).approve(await lendingContract.getAddress(), ethers.parseEther("500"));
    await lendingContract.connect(addr1).depositLiquidity(ethers.parseEther("500"));
    
    await expect(lendingContract.connect(addr1).withdrawLiquidity(ethers.parseEther("200")))
      .to.emit(lendingContract, "LiquidityWithdrawn")
      .withArgs(addr1.address, ethers.parseEther("200"));
  });
});
