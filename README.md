# Tokenized Crowdfunding Platform (Sepolia Testnet)

A decentralized crowdfunding DApp where contributors send **test ETH** to campaigns and automatically receive **ERC-20 reward tokens** in return.

> Network: **Ethereum Sepolia (testnet)**  
> Wallet: **MetaMask**  
> Smart contracts: **Solidity (Remix)**  
> Frontend: **HTML/CSS/JS + ethers.js**

---

## 1) Project Idea

This is a normal crowdfunding model (raising funds), but instead of “just thank you”, a contributor receives **reward tokens**:

- User contributes `X` test ETH
- The smart contract mints `X * rewardRate` ERC-20 tokens to the contributor automatically

Key goals:
- Create campaigns with a funding goal and a deadline
- Allow users to contribute test ETH
- Track contributions per user
- Finalize campaigns
- If campaign fails (goal not reached), contributors can claim refunds
- Mint reward tokens on each contribution

---

## 2) Tech Stack

- **Solidity** (Remix IDE)
- **OpenZeppelin ERC-20**
- **MetaMask** (Injected Provider)
- **Sepolia testnet**
- **ethers.js** frontend

---

## 3) Smart Contracts Overview

### 3.1 RewardToken (ERC-20)
- Standard ERC-20 token
- Minting is restricted to the contract owner (`onlyOwner`)
- Owner is set to the crowdfunding contract so it can mint tokens

### 3.2 TokenizedCrowdfunding
- Stores campaigns:
  - `creator`
  - `title`
  - `goalWei`
  - `deadline`
  - `raisedWei`
  - `finalized`
  - `successful`
- Tracks contributions:
  - `contributions[campaignId][user]`

Main functions:
- `createCampaign(title, goalWei, durationSeconds)`
- `contribute(campaignId)` (payable) → mints reward tokens
- `finalize(campaignId)` → success/fail decision + funds transfer if successful
- `claimRefund(campaignId)` → only if finalized AND unsuccessful

Reward logic:
- `mintedTokens = contributedWei * rewardRate`
- Example: `rewardRate = 1000` → `1 ETH` gives `1000 tokens`

---

## 4) Why Sepolia (Testnet)

Sepolia is an official Ethereum test network:
- Uses **test ETH (no real value)**
- Supported by MetaMask and Remix
- Safe for development/testing and course projects

---

## 5) Deployment Guide (Remix + MetaMask)

### Requirements
- MetaMask installed in **Chrome**
- MetaMask network set to **Sepolia**
- Some **SepoliaETH** from a faucet

### Step A — Deploy RewardToken
1. Open Remix
2. Create `RewardToken.sol`
3. Compile with Solidity `0.8.20`
4. Deploy via:
   - **Deploy & Run → Environment: Injected Provider – MetaMask**
5. Constructor args:
   - name: `CrowdReward`
   - symbol: `CRWD`
6. Confirm in MetaMask
7. Copy **RewardToken address**

### Step B — Deploy TokenizedCrowdfunding
1. Create `TokenizedCrowdfunding.sol`
2. Compile
3. Deploy with constructor args:
   - `rewardTokenAddress` = RewardToken address
   - `rewardRateTokensPerEth` = `1000`
4. Confirm in MetaMask
5. Copy **Crowdfunding address**

### Step C — Transfer token ownership to crowdfunding (IMPORTANT)
In Remix → deployed `RewardToken`:
- Call `transferOwnership(<CrowdfundingAddress>)`


## 6) Frontend Setup (VS Code)

### Files
- `index.html`
- `app.js`
- `style.css` (optional)

### Run with Live Server
1. Open project folder in VS Code
2. Install extension **Live Server**
3. Right click `index.html` → **Open with Live Server**
4. Make sure it opens in **Chrome** 

### Configure addresses in UI
In the frontend UI paste:
- Crowdfunding contract address
- RewardToken address

Then:
- Click **Connect MetaMask**
- Click **Load campaigns**

---

## 7) Demo Script (for teacher)

### Show that it’s a test network
1. Open MetaMask
2. Show network = **Sepolia**
3. Show test ETH balance

### Show deployed contracts
1. Open Remix
2. Show both contracts are deployed
3. In RewardToken call `owner()` and show it equals crowdfunding address

### Show full DApp workflow
1. Frontend → Connect MetaMask
2. Create campaign:
   - Goal: `0.01 ETH`
   - Duration: `10 minutes`
3. Contribute:
   - `0.002 ETH`
4. Show:
   - `Raised` increased
   - `Token balance` increased
5. Complete goal (optional):
   - Contribute until `Raised >= Goal`
   - Click `Finalize` → `Successful = true`

### Refund scenario (optional bonus)
1. Create campaign with higher goal, short duration:
   - Goal: `0.02 ETH`
   - Duration: `2-3 minutes`
2. Contribute `0.001 ETH`
3. After deadline click `Finalize` → `Successful = false`
4. Click `Claim Refund` → ETH returns to contributor

---

## 8) Common Issues & Fixes

### “MetaMask not found”
- You opened the site in Edge, but MetaMask is installed in Chrome
- Fix: copy Live Server URL and open it in **Chrome**

### Token balance not updating
Most common reasons:
- Token address is incorrect
- UI wasn’t refreshed after transaction
- Wrong network (not Sepolia)

Quick checks:
- In Remix call `RewardToken.balanceOf(yourAddress)`
- Refresh the page after contribution

### “successful => no refunds”
Refund is only allowed when:
- campaign is `finalized == true`
- and `successful == false`
If successful is true, refunds are disabled by design.
