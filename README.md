# RWA Tokenization — React Frontend Application

> **University Research Prototype:** React 19 + Vite + Tailwind CSS v4 + ethers.js v6 + Lucide Icons  
> **Development Port:** `http://localhost:5173/` | Real-World Asset (RWA) Tokenization User Interface

---

## 1. Overview

The frontend delivers an intuitive, institutional-grade web interface for fractional real-world property tokenization. It enables landowners, retail investors, and admins to interact with the underlying smart contracts through MetaMask.

### Core Modules
1. **Portfolio Dashboard:** High-level metrics (Total Portfolio Valuation, Issued Fractions, Cryptographic Deeds), balance charts, and real-time yield curves.
2. **Asset Marketplace:** Fixed-price share trading, search/filter controls, and multi-currency buying (**Option A: Pay with ETH**, **Option B: Pay with tokens from another owned land property**).
3. **Governance & DAO Votes:** Decentralized community proposals with **snapshot-weighted voting power** and quorum tracking.
4. **Rental Yield & Profit Waterfall:** Institutional Covercy-style 4-step distribution waterfall (`Autosized` $\rightarrow$ `Draft` $\rightarrow$ `Confirmed` $\rightarrow$ `Payment Sent`) and pull-based dividend claims.
5. **Admin Console:** Cryptographic title deed hash verification and ERC-1155 token minting.
6. **Multi-User Hub:** On-screen switcher and private keys for importing test personas into MetaMask.

---

## 2. Color Theme Design System

The user interface adheres strictly to a curated, high-contrast dark space palette:

| Token | Hex Value | Role | Usage |
| :--- | :--- | :--- | :--- |
| **BACKGROUND** | `#050816` | Deep Space Navy/Black | Viewport background, glass card surfaces, modal backdrops (`#050816/85`). |
| **PRIMARY** | `#4F46E5` | Indigo (Main Brand) | Primary action CTAs ("Buy Shares", "Register Property", "Calculate Waterfall", "Cast Vote"), active nav tabs. |
| **ACCENT** | `#00E5FF` | Neon Cyan (Highlights) | Secondary highlights ("Transfer Shares", "Claim Yield", "Mint & Tokenize"), live status dots, SVG chart lines. |
| **SECONDARY** | `#94A3BB` | Slate (Muted Text) | Supporting labels, deed IDs, contract metadata, and card borders (`#94A3BB/20`). |
| **TEXT** | `#FFFFFF` | Pure White | Page headings, valuation figures, and high-emphasis titles. |

---

## 3. Installation & Setup

Ensure Node.js (v20 or v22) is installed.

```bash
cd asset-tokenization-frontend
npm install
```

---

## 4. How to Run

### Development Mode (with Live Hot-Reloading)
```bash
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

### Production Build Validation
```bash
npm run build
```
Generates minified production assets in `dist/` and validates 0 syntax/bundling errors.

---

## 5. MetaMask Configuration

Ensure MetaMask is installed in your browser and connected to your local Hardhat network:

- **Network Name:** `Hardhat Local`
- **RPC URL:** `http://127.0.0.1:8545`
- **Chain ID:** `31337`
- **Currency Symbol:** `ETH`

### Test Accounts to Import (Pre-Funded with 10,000 Test ETH)
- **User 1 (Admin/Deployer):** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`  
  *Private Key:* `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **User 2 (Investor B):** `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`  
  *Private Key:* `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- **User 3 (Partner C):** `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`  
  *Private Key:* `0x5de4111afa1a4b94908f83103eb2f95402bbf309988307374433a625ffb6ee92`

---

## 6. Smart Contract Integration

Contract addresses and ABIs are automatically synchronized from the blockchain deployment script into:
```text
src/contracts/deployedContracts.json
```
The helper service [`src/services/contractService.js`](file:///d:/Research/Development/Implementation/asset-tokenization-frontend/src/services/contractService.js) exposes typed interaction methods:
- `getContracts(withSigner)`: Instantiates ethers v6 contracts for all 5 modules.
- `getTokenBalance(walletAddress, assetId)`: Queries live on-chain balances.
- `buyFromMarketplace(listingId, amount, totalPriceWei)`: Atomic share purchase.
- `listItemOnMarketplace(assetId, amount, pricePerShareWei)`: Escrow share listing.
- `castVoteOnChain(proposalId, support)`: Submits snapshot-weighted governance vote.
- `claimProfitYield(periodId)`: Executes pull-based rental dividend claim.
- `registerAssetOnChain(...)`: Records asset deed digest on `AssetRegistry.sol`.

---

## 7. Troubleshooting

- **MetaMask doesn't pop up:** Click the MetaMask fox icon in your browser toolbar to review any pending requests (RPC Error `-32002`).
- **Transaction stuck / Nonce too high:** Go to MetaMask $\rightarrow$ **Settings** $\rightarrow$ **Advanced** $\rightarrow$ **Clear activity tab data**.
- **Network mismatch:** The application automatically prompts MetaMask to switch to Chain ID `31337`. If prompted, approve the switch request.
