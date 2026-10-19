import { ethers } from "ethers";
import deployedData from "../contracts/deployedContracts.json";

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

    registryAbi: c.AssetRegistry?.abi || [],
    tokenAbi: c.AssetToken?.abi || [],
    paymentTokenAbi: c.MockPaymentToken?.abi || [],
    marketplaceAbi: c.AssetMarketplace?.abi || [],
    tokenMarketplaceAbi: c.TokenMarketplace?.abi || [],
    governanceAbi: c.AssetGovernance?.abi || [],
    snapshotDistributionAbi: c.SnapshotProfitDistribution?.abi || [],
    distributionAbi: c.ProfitDistribution?.abi || []
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

export async function getContracts(withSigner = false) {
  const addrs = getContractAddresses();
  let runner;
  if (withSigner) {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed. Please connect MetaMask to submit transactions.");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    runner = await provider.getSigner();
  } else {
    runner = getReadonlyProvider();
  }

  const registryContract = new ethers.Contract(addrs.registryAddress, addrs.registryAbi, runner);
  const tokenContract = new ethers.Contract(addrs.tokenAddress, addrs.tokenAbi, runner);
  const paymentTokenContract = new ethers.Contract(addrs.paymentTokenAddress, addrs.paymentTokenAbi, runner);
  const tokenMarketplaceContract = new ethers.Contract(addrs.tokenMarketplaceAddress, addrs.tokenMarketplaceAbi, runner);
  const distributionContract = new ethers.Contract(addrs.distributionAddress, addrs.distributionAbi, runner);
  const governanceContract = new ethers.Contract(addrs.governanceAddress, addrs.governanceAbi, runner);

  return {
    registryContract,
    tokenContract,
    paymentTokenContract,
    tokenMarketplaceContract,
    distributionContract,
    governanceContract,
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

export async function getPaymentTokenBalance(walletAddress) {
  try {
    const { paymentTokenContract } = await getContracts(false);
    const bal = await paymentTokenContract.balanceOf(walletAddress);
    return Number(ethers.formatUnits(bal, 6));
  } catch (error) {
    return 0;
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

