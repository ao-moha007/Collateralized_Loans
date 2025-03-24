# Decentralized Lending & Loan Smart Contract

# Overview
The Decentralized Lending Loan contract enables users to borrow loans against their collateral while allowing liquidity providers to earn interest. It utilizes Chainlink price feeds for real-time asset valuation and enforces secure lending practices through a collateralization ratio, interest rates, and liquidation mechanisms.

# Features

# For Borrowers
Collateralized Loans: Borrow funds by depositing collateral (ERC20 tokens).

Interest-Based Lending: Interest is accrued based on the loan duration.

Flexible Repayments: Supports full and partial loan repayments.

Collateral Withdrawal: Borrowers can withdraw excess collateral if their loan remains healthy.

# For Liquidity Providers
Deposit Liquidity: Provide loan tokens to earn interest.

Withdraw Liquidity: Liquidity providers can withdraw their funds along with accrued interest.

Security & Risk Management
Collateralization Ratio (150%): Ensures that loans are backed by sufficient collateral.

Liquidation Mechanism: If a borrower's loan falls below the required collateralization ratio, their collateral can be liquidated.

Chainlink Price Feed: Fetches real-time price data to prevent price manipulation.

Owner & Authorization Controls: The contract owner can manage critical parameters like interest rates and liquidation penalties.
