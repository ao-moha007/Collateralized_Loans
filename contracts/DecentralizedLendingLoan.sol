// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
interface ERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract DecentralizedLendingLoan {
    ERC20 public collateralToken;
    ERC20 public loanToken;
    address public owner;
    mapping(address => bool) public authorized;

    mapping(address => uint256) public collateralDeposited;
    mapping(address => uint256) public loanAmount;
    mapping(address => uint256) public liquidityBalance;
    mapping(address => uint256) public loanDuration;
    mapping(address => uint256) public loanStartTime;


    uint256 public totalLiquidity;
    uint256 public totalLoaned;
    uint256 public totalInterestAccumulated;
    uint256 public maxLoanAmountAfterWithdrawal;
    uint256 public remainingCollateral;
    uint256 public timeLeft;
    uint256 public calculatedInterest;
    AggregatorV3Interface public priceFeed;

    uint256 public collateralizationRatio = 150; // 150% collateral-to-loan ratio
    uint256 public annualInterestRate = 500; // 5% interest rate (in basis points)
    uint256 public liquidationPenalty = 10; // 10% penalty on collateral liquidation

    event LiquidityDeposited(address provider, uint256 amount);
    event LiquidityWithdrawn(address provider, uint256 amount);
    event LoanTaken(address borrower, uint256 amount);
    event LoanRepaid(address borrower, uint256 amount);
    event CollateralLiquidated(address borrower, uint256 amount);
    event CollateralWithdrawn(address provider,uint256 amount);
    event CollateralDeposited(address provider,uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can execute this");
        _;
    }

    modifier onlyAuthorized() {
        require(authorized[msg.sender], "Only authorized addresses can execute this");
        _;
    }

    constructor(address _collateralToken, address _loanToken, address _priceFeed) {
        collateralToken = ERC20(_collateralToken);
        loanToken = ERC20(_loanToken);
        owner = msg.sender;  // Set the owner to the address that deploys the contract
        priceFeed = AggregatorV3Interface(_priceFeed);

    }
    
    // Function to get the latest ETH/USD price
    function getLatestPrice() public view returns (uint256) {
        (, int price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price data");
        return uint256(price) * 1e10; // Adjust for decimals
    }

    function getCollateralValue(address borrower) public view returns (uint256) {
        uint256 collateralAmount = collateralDeposited[borrower];
        uint256 price = getLatestPrice();
        return (collateralAmount * price) / 1e18;
    }

    function getMaxBorrowAmount(address borrower) public view returns (uint256) {
        uint256 collateralValue = getCollateralValue(borrower);
        return (collateralValue * 100) / collateralizationRatio;
    }

    /*** LIQUIDITY PROVIDER FUNCTIONS ***/
    
    function depositLiquidity(uint256 amount) external {
        require(amount > 0, "Must deposit > 0");
        
        loanToken.transferFrom(msg.sender, address(this), amount);
        liquidityBalance[msg.sender] += amount;
        totalLiquidity += amount;

        emit LiquidityDeposited(msg.sender, amount);
    }

    function withdrawLiquidity(uint256 amount) external {
        require(liquidityBalance[msg.sender] > 0, "No liquidity provided");
        require(amount <= getWithdrawableBalance(msg.sender), "Insufficient withdrawable balance");

        liquidityBalance[msg.sender] -= amount;
        totalLiquidity -= amount;

        loanToken.transfer(msg.sender, amount);
        emit LiquidityWithdrawn(msg.sender, amount);
    }

    function getWithdrawableBalance(address provider) public view returns (uint256) {
        uint256 providerShare = (liquidityBalance[provider] * 1e18) / totalLiquidity;
        uint256 interestEarned = (totalInterestAccumulated * providerShare) / 1e18;
        return liquidityBalance[provider] + interestEarned;
    }

    /*** BORROWER FUNCTIONS ***/

    function depositCollateral(uint256 amount) external {
        require(amount > 0, "Must deposit > 0");
        collateralToken.transferFrom(msg.sender, address(this), amount);
        collateralDeposited[msg.sender] += amount;
        emit  CollateralDeposited(msg.sender, amount);
    }

    function takeLoan(uint256 amount, uint256 duration) external {
        require(collateralDeposited[msg.sender] > 0, "No collateral provided");
        require(amount <= getMaxBorrowAmount(msg.sender), "Exceeds max borrow limit");

        loanAmount[msg.sender] += amount;
        totalLoaned += amount;
        loanStartTime[msg.sender] = block.timestamp;
        loanDuration[msg.sender] = duration;

        loanToken.transfer(msg.sender, amount);
        emit LoanTaken(msg.sender, amount);
    }

    // function getMaxBorrowAmount(address borrower) public view returns (uint256) {
    //     return (collateralDeposited[borrower] * 100) / collateralizationRatio;
    // }

    function repayLoan(uint256 amount) external {
        require(loanAmount[msg.sender] > 0, "No outstanding loan");
        
        uint256 interestDue = calculateInterest(msg.sender);
        uint256 totalDue = loanAmount[msg.sender] + interestDue;
        require(amount >= totalDue, "Insufficient repayment amount");

        loanAmount[msg.sender] = 0;
        totalLoaned -= loanAmount[msg.sender];
        totalInterestAccumulated += interestDue;

        loanToken.transferFrom(msg.sender, address(this), totalDue);
        //collateralToken.transfer(msg.sender, collateralDeposited[msg.sender]);
        //collateralDeposited[msg.sender] = 0;

        emit LoanRepaid(msg.sender, totalDue);
    }

    function repayLoanPartial(uint256 amount) external {

        require(loanAmount[msg.sender] > 0, "No outstanding loan");
        uint256 interestDue = 1;//calculateInterest(msg.sender);
        uint256 totalDue = loanAmount[msg.sender] + interestDue;

        require(amount <= totalDue, "Repayment amount exceeds due amount");
        loanAmount[msg.sender] -= amount;

        loanToken.transferFrom(msg.sender, address(this), amount);
        emit LoanRepaid(msg.sender, amount);

    }


    function calculateInterest(address borrower) public  returns (uint256) {
        uint256 timeElapsed = block.timestamp - loanStartTime[borrower];
        timeLeft = loanDuration[borrower] - timeElapsed;
        uint256 interest = (loanAmount[borrower] * annualInterestRate * timeElapsed) / (10000 * 365 days);
        calculatedInterest = interest;
        return interest;
        //return (loanAmount[borrower] * annualInterestRate) / 10000;
    }

    function getCalculatedInterest(address borrower) public  returns (uint256) {
    calculatedInterest = calculateInterest(borrower);
    return calculatedInterest;
}


    /*** LIQUIDATION ***/

    function liquidate(address borrower) external {
        require(loanAmount[borrower] > 0, "No outstanding loan");
        
        uint256 maxBorrowable = getMaxBorrowAmount(borrower);
        require(loanAmount[borrower] > maxBorrowable, "Loan is still healthy");

        uint256 penalty = (collateralDeposited[borrower] * liquidationPenalty) / 100;
        uint256 liquidatedAmount = collateralDeposited[borrower] - penalty;
        
        collateralDeposited[borrower] = 0;
        loanAmount[borrower] = 0;
        totalLoaned -= maxBorrowable;

        collateralToken.transfer(msg.sender, liquidatedAmount);
        emit CollateralLiquidated(borrower, liquidatedAmount);
    }

    function autoLiquidate(address borrower) view external { //To change view keyword when updated
        //uint256 currentCollateral = collateralDeposited[borrower];
        uint256 maxBorrowable = getMaxBorrowAmount(borrower);
        if (loanAmount[borrower] > maxBorrowable) {
            // Liquidation logic...
        }
    }


    function withdrawCollateral(uint256 amount) external {
        require(collateralDeposited[msg.sender] >= amount, "Not enough collateral");
        require(loanAmount[msg.sender] == 0, "Cannot withdraw while loan is active");

        collateralDeposited[msg.sender] -= amount;
        collateralToken.transfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, amount);
    }

    function partialCollateralWithdraw(uint256 amount) external {
            uint256 currentCollateral = collateralDeposited[msg.sender];
            //uint256 currentLoanAmount = loanAmount[msg.sender];

            // Ensure the user has enough collateral to cover the loan after withdrawal
            remainingCollateral = currentCollateral - amount;
            maxLoanAmountAfterWithdrawal = (remainingCollateral * 100) / collateralizationRatio;
            
           // Ensure that the remaining collateral is enough to cover the loan
           require(loanAmount[msg.sender] <= maxLoanAmountAfterWithdrawal, "Insufficient collateral after withdrawal");

            // Proceed with the partial withdrawal
            collateralDeposited[msg.sender] -= amount;
            collateralToken.transfer(msg.sender, amount);

            emit CollateralWithdrawn(msg.sender, amount);
    }

    // Function to update the collateralization ratio
    function setCollateralizationRatio(uint256 newCollateralizationRatio) external onlyOwner {
        require(newCollateralizationRatio > 0, "Collateralization ratio must be greater than zero");
        collateralizationRatio = newCollateralizationRatio;
    }

    // Function to update the annual interest rate
    function setAnnualInterestRate(uint256 newInterestRate) external onlyOwner {
        require(newInterestRate > 0, "Interest rate must be greater than zero");
        annualInterestRate = newInterestRate;
    }

    // Function to update the liquidation penalty
    function setLiquidationPenalty(uint256 newLiquidationPenalty) external onlyOwner {
        require(newLiquidationPenalty <= 100, "Liquidation penalty cannot exceed 100%");
        liquidationPenalty = newLiquidationPenalty;
    }

    function setAuthorized(address _user, bool _status) external onlyOwner {
        authorized[_user] = _status;
    }


}
