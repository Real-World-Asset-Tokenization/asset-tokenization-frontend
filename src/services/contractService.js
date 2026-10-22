import { ethers } from "ethers";
import deployedData from "../contracts/deployedContracts.json";
import { resolveUserWallet } from "../lib/walletResolver";

export const LOCAL_CHAIN_ID = 31337;
export const LOCAL_CHAIN_HEX = "0x7a69";

export function getContractAddresses() {
  const c = deployedData?.contracts || {};
  return {
    registryAddress: c.AssetRegistry?.address || "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
    tokenAddress: c.AssetToken?.address || "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
    paymentTokenAddress: c.MockPaymentToken?.address || "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
    marketplaceAddress: c.AssetMarketplace?.address || "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
    tokenMarketplaceAddress: c.TokenMarketplace?.address || "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f",
    governanceAddress: c.AssetGovernance?.address || "0x4A679253410272dd5232B3Ff7cF5dbB88f295319",
    snapshotDistributionAddress: c.SnapshotProfitDistribution?.address || "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F",
    distributionAddress: c.ProfitDistribution?.address || "0x09635F643e140090A9A8Dcd712eD6285858ceBef",
    propertySaleAddress: c.PropertySale?.address || "",
    // Marketplaces that were replaced: their past trades still count toward price history.
    previousTokenMarketplaces: deployedData?.previousTokenMarketplaces || [],

    registryAbi: c.AssetRegistry?.abi || [],
    tokenAbi: c.AssetToken?.abi || [],
    paymentTokenAbi: c.MockPaymentToken?.abi || [],
    marketplaceAbi: c.AssetMarketplace?.abi || [],
    tokenMarketplaceAbi: c.TokenMarketplace?.abi || [],
    governanceAbi: c.AssetGovernance?.abi || [],
    snapshotDistributionAbi: c.SnapshotProfitDistribution?.abi || [],
    distributionAbi: c.ProfitDistribution?.abi || [],
    propertySaleAbi: c.PropertySale?.abi || []
  };
}

export function getReadonlyProvider() {
  return new ethers.JsonRpcProvider("http://127.0.0.1:8545");
}

export async function getBrowserProvider() {
  if (!window.ethereum) {
    return new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function checkAndSwitchNetwork() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: LOCAL_CHAIN_HEX }],
    });
  } catch (switchError) {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: LOCAL_CHAIN_HEX,
            chainName: "Hardhat Localhost",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["http://127.0.0.1:8545"],
          },
        ],
      });
    } catch (addError) {
      console.error("Failed to add or switch network in MetaMask:", addError);
    }
  }
}

export const walletImportHelp =
  "If that account is not in your MetaMask list, add it: MetaMask menu → Add account or hardware wallet → Import account, then paste its private key " +
  "(for the local test chain, the keys are printed by `npx hardhat node`, where Account #0 is 0xf39f…2266 and Account #1 is 0x7099…79c8).";

/**
 * Makes sure MetaMask shares the wallet saved on the signed-in account with this site.
 * If it does not, MetaMask's account chooser is opened so the user can tick it.
 * Returns the accounts MetaMask now shares.
 */
export async function selectLinkedWallet(expectedWallet) {
  if (!window.ethereum) throw new Error("MetaMask is not installed. Please connect MetaMask to submit transactions.");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const has = (list) => list.some((a) => a.toLowerCase() === expectedWallet.toLowerCase());
  let accounts = await provider.send("eth_accounts", []);
  if (has(accounts)) return accounts;
  try {
    await provider.send("wallet_requestPermissions", [{ eth_accounts: {} }]);
  } catch (error) {
    if (error?.code === 4001) throw new Error("MetaMask account selection was cancelled.");
    if (error?.code === -32002) throw new Error("MetaMask already has a request open. Click the MetaMask icon in your browser toolbar, finish it, and try again.");
    // Some injected wallets do not implement wallet_requestPermissions.
    await provider.send("eth_requestAccounts", []);
  }
  accounts = await provider.send("eth_accounts", []);
  return accounts;
}

export async function getContracts(withSigner = false) {
  const addrs = getContractAddresses();
  let runner;
  if (withSigner) {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed. Please connect MetaMask to submit transactions.");
    }
    await checkAndSwitchNetwork();
    const provider = new ethers.BrowserProvider(window.ethereum);
    let signedInUser = null;
    try {
      signedInUser = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      // A malformed cached session is handled below as an unlinked account.
    }
    const expectedWallet = resolveUserWallet(signedInUser);
    if (signedInUser && !expectedWallet) {
      throw new Error("Link a wallet to your signed-in account before making transactions.");
    }

    let accounts = await provider.send("eth_accounts", []);
    const hasExpectedWallet = () => expectedWallet && accounts.some(
      (account) => account.toLowerCase() === expectedWallet.toLowerCase()
    );

    if (expectedWallet && !hasExpectedWallet()) {
      // A transaction button is a user gesture, so it is safe to open MetaMask's account chooser here.
      accounts = await selectLinkedWallet(expectedWallet);
    }

    if (expectedWallet) {
      if (!hasExpectedWallet()) {
        const activeWallet = accounts[0]?.toLowerCase();
        throw new Error(
          activeWallet
            ? `MetaMask is using ${activeWallet}, but this login is linked to ${expectedWallet}. In MetaMask, tick the linked account when asked, then try again. ${walletImportHelp}`
            : `MetaMask is not connected. Select your linked wallet (${expectedWallet}) and try again. ${walletImportHelp}`
        );
      }
      // Select by address instead of using getSigner()'s unstable first account.
      runner = await provider.getSigner(expectedWallet);
    } else {
      runner = await provider.getSigner();
    }
  } else {
    runner = getReadonlyProvider();
  }

  const registryContract = new ethers.Contract(addrs.registryAddress, addrs.registryAbi, runner);
  const tokenContract = new ethers.Contract(addrs.tokenAddress, addrs.tokenAbi, runner);
  const paymentTokenContract = new ethers.Contract(addrs.paymentTokenAddress, addrs.paymentTokenAbi, runner);
  const tokenMarketplaceContract = new ethers.Contract(addrs.tokenMarketplaceAddress, addrs.tokenMarketplaceAbi, runner);
  const distributionContract = new ethers.Contract(addrs.distributionAddress, addrs.distributionAbi, runner);
  const governanceContract = new ethers.Contract(addrs.governanceAddress, addrs.governanceAbi, runner);
  const saleContract = addrs.propertySaleAddress ? new ethers.Contract(addrs.propertySaleAddress, addrs.propertySaleAbi, runner) : null;

  return {
    registryContract,
    tokenContract,
    paymentTokenContract,
    tokenMarketplaceContract,
    distributionContract,
    governanceContract,
    saleContract,
    addrs,
    runner
  };
}

export async function getTokenBalance(walletAddress, assetId) {
  try {
    const { tokenContract } = await getContracts(false);
    const bal = await tokenContract.balanceOf(walletAddress, assetId);
    return Number(bal);
  } catch (error) {
    console.warn(`Could not fetch balance for asset ${assetId}:`, error);
    return 0;
  }
}

export async function getPaymentTokenBalance(walletAddress, { throwOnError = false } = {}) {
  const { paymentTokenContract, runner } = await getContracts(false);
  try {
    if (await runner.getCode(await paymentTokenContract.getAddress()) === "0x") {
      const error = new Error("Local chain needs setup");
      error.code = "PAYMENT_TOKEN_NOT_DEPLOYED";
      throw error;
    }
    const [bal, decimals] = await Promise.all([
      paymentTokenContract.balanceOf(walletAddress),
      paymentTokenContract.decimals(),
    ]);
    return Number(ethers.formatUnits(bal, decimals));
  } catch (error) {
    console.warn("Payment token balance unavailable:", error);
    if (throwOnError) throw error;
    return null;
  } finally {
    runner.destroy();
  }
}

export async function trackTxGas(txHash, operationType, payerAddress, payerCategory = "Investor", assetId = null) {
  try {
    await fetch("http://localhost:5001/api/marketplace/track-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txHash,
        operationType,
        payerAddress,
        payerCategory,
        assetId
      })
    });
  } catch (err) {
    console.warn("Could not log tx gas to backend:", err);
  }
}

/**
 * Register asset on-chain in AssetRegistry.sol
 */
export async function registerAssetOnChain({ name, symbol, metadataURI, documentHash, valuationLKR, totalShares }) {
  await checkAndSwitchNetwork();
  const { registryContract } = await getContracts(true);
  const tx = await registryContract.registerAsset(
    name,
    symbol || "RWA",
    metadataURI || `ipfs://placeholder`,
    documentHash || "0x0000000000000000000000000000000000000000000000000000000000000000",
    BigInt(valuationLKR || 1000000),
    BigInt(totalShares || 1000)
  );
  return await tx.wait();
}

/**
 * Approve asset on-chain in AssetRegistry.sol (Admin)
 */
export async function approveAssetOnChain(assetId) {
  await checkAndSwitchNetwork();
  const { registryContract } = await getContracts(true);
  const tx = await registryContract.approveAsset(Number(assetId));
  return await tx.wait();
}

/**
 * Tokenize asset on-chain in AssetToken.sol (ERC-1155 fractional minting)
 */
export async function tokenizeAssetOnChain(assetId, recipient) {
  await checkAndSwitchNetwork();
  const { tokenContract, runner } = await getContracts(true);
  const signerAddress = await runner.getAddress();
  const tx = await tokenContract.tokenizeAsset(Number(assetId), recipient || signerAddress);
  return await tx.wait();
}


// Azure asset records can carry a stale blockchain id (old seed data or a previous
// chain deployment). Only trust the link when the on-chain asset has the same name.
const chainNameCache = new Map();
export async function resolveChainAssetId(asset) {
  const id = asset?.blockchainAssetId ?? asset?.tokenId ?? null;
  if (id == null) return null;
  if (!chainNameCache.has(id)) {
    chainNameCache.set(id, (async () => {
      const { registryContract, runner } = await getContracts(false);
      try { return (await registryContract.getAsset(id)).name; } catch { return null; } finally { runner.destroy(); }
    })());
  }
  const name = await chainNameCache.get(id);
  return name && name === (asset.name || asset.assetName) ? Number(id) : null;
}

// Token balance for an Azure asset record, 0 if it is not on the current chain.
export async function getVerifiedTokenBalance(wallet, asset) {
  const id = await resolveChainAssetId(asset);
  return id == null ? 0 : getTokenBalance(wallet, id);
}
