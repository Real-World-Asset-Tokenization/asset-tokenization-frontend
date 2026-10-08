import { ethers } from "ethers";
import deployedData from "../contracts/deployedContracts.json";

export const LOCAL_CHAIN_ID = 31337;
export const LOCAL_CHAIN_HEX = "0x7a69";

export function getContractAddresses() {
  return {
    registryAddress: deployedData?.contracts?.AssetRegistry?.address || "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
    tokenAddress: deployedData?.contracts?.AssetToken?.address || "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
    marketplaceAddress: deployedData?.contracts?.AssetMarketplace?.address || "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
    governanceAddress: deployedData?.contracts?.AssetGovernance?.address || "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
    distributionAddress: deployedData?.contracts?.ProfitDistribution?.address || "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
    registryAbi: deployedData?.contracts?.AssetRegistry?.abi || [],
    tokenAbi: deployedData?.contracts?.AssetToken?.abi || [],
    marketplaceAbi: deployedData?.contracts?.AssetMarketplace?.abi || [],
    governanceAbi: deployedData?.contracts?.AssetGovernance?.abi || [],
    distributionAbi: deployedData?.contracts?.ProfitDistribution?.abi || []
  };
}

export async function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to interact with the blockchain.");
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
  const {
    registryAddress,
    tokenAddress,
    marketplaceAddress,
    governanceAddress,
    distributionAddress,
    registryAbi,
    tokenAbi,
    marketplaceAbi,
    governanceAbi,
    distributionAbi
  } = getContractAddresses();

  const provider = await getBrowserProvider();
  let runner = provider;
  if (withSigner) {
    runner = await provider.getSigner();
  }

  const registryContract = new ethers.Contract(registryAddress, registryAbi, runner);
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, runner);
  const marketplaceContract = new ethers.Contract(marketplaceAddress, marketplaceAbi, runner);
  const governanceContract = new ethers.Contract(governanceAddress, governanceAbi, runner);
  const distributionContract = new ethers.Contract(distributionAddress, distributionAbi, runner);

  return {
    registryContract,
    tokenContract,
    marketplaceContract,
    governanceContract,
    distributionContract,
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

export async function registerAssetOnChain({ name, symbol, metadataURI, documentHash, valuationLKR, totalShares }) {
  await checkAndSwitchNetwork();
  const { registryContract } = await getContracts(true);
  const tx = await registryContract.registerAsset(
    name,
    symbol,
    metadataURI,
    documentHash,
    BigInt(valuationLKR),
    BigInt(totalShares)
  );
  return await tx.wait();
}

export async function approveAssetOnChain(assetId) {
  await checkAndSwitchNetwork();
  const { registryContract } = await getContracts(true);
  const tx = await registryContract.approveAsset(BigInt(assetId));
  return await tx.wait();
}

export async function tokenizeAssetOnChain(assetId, recipient) {
  await checkAndSwitchNetwork();
  const { tokenContract } = await getContracts(true);
  const tx = await tokenContract.tokenizeAsset(BigInt(assetId), recipient);
  return await tx.wait();
}

export async function transferFractionalTokens(recipient, assetId, amount) {
  await checkAndSwitchNetwork();
  const { tokenContract, runner } = await getContracts(true);
  const senderAddress = await runner.getAddress();
  const tx = await tokenContract.safeTransferFrom(
    senderAddress,
    recipient,
    BigInt(assetId),
    BigInt(amount),
    "0x"
  );
  return await tx.wait();
}

/* Marketplace On-Chain Helpers */
export async function buyFromMarketplace(listingId, amount, totalPriceWei) {
  await checkAndSwitchNetwork();
  const { marketplaceContract } = await getContracts(true);
  const tx = await marketplaceContract.buyItem(BigInt(listingId), BigInt(amount), {
    value: BigInt(totalPriceWei)
  });
  return await tx.wait();
}

export async function listItemOnMarketplace(assetId, amount, pricePerShareWei) {
  await checkAndSwitchNetwork();
  const { tokenContract, marketplaceContract, runner } = await getContracts(true);
  const { marketplaceAddress } = getContractAddresses();
  const sender = await runner.getAddress();

  // Ensure marketplace approval
  const isApproved = await tokenContract.isApprovedForAll(sender, marketplaceAddress);
  if (!isApproved) {
    const approveTx = await tokenContract.setApprovalForAll(marketplaceAddress, true);
    await approveTx.wait();
  }

  const tx = await marketplaceContract.listItem(BigInt(assetId), BigInt(amount), BigInt(pricePerShareWei));
  return await tx.wait();
}

/* Governance On-Chain Helpers */
export async function castVoteOnChain(proposalId, support) {
  await checkAndSwitchNetwork();
  const { governanceContract } = await getContracts(true);
  const tx = await governanceContract.castVote(BigInt(proposalId), support);
  return await tx.wait();
}

export async function createProposalOnChain(assetId, description, durationBlocks = 5000) {
  await checkAndSwitchNetwork();
  const { governanceContract } = await getContracts(true);
  const tx = await governanceContract.createProposal(BigInt(assetId), description, BigInt(durationBlocks));
  return await tx.wait();
}

/* Profit Distribution On-Chain Helpers */
export async function claimProfitYield(periodId) {
  await checkAndSwitchNetwork();
  const { distributionContract } = await getContracts(true);
  const tx = await distributionContract.claimProfit(BigInt(periodId));
  return await tx.wait();
}

export async function fundDistributionOnChain(assetId, quarterOrTitle, amountWei) {
  await checkAndSwitchNetwork();
  const { distributionContract } = await getContracts(true);
  const tx = await distributionContract.fundDistribution(BigInt(assetId), quarterOrTitle, {
    value: BigInt(amountWei)
  });
  return await tx.wait();
}
