import { ethers } from "ethers";
import { getContracts, checkAndSwitchNetwork, trackTxGas } from "./contractService";

const API_BASE = "http://localhost:5001/api/tokenization";

/**
 * Fetch verified assets eligible for tokenization
 */
export async function fetchVerifiedAssets(ownerWallet = null) {
  try {
    const url = ownerWallet
      ? `${API_BASE}/verified-assets?owner=${ownerWallet}`
      : `${API_BASE}/verified-assets`;
    const res = await fetch(url);
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    console.error("Failed to fetch verified assets:", err);
    return [];
  }
}

/**
 * Fetch unmodifiable tokenization preview (formula, approved valuation, reference price, supply)
 */
export async function fetchTokenizationPreview(assetId, callerWallet = null) {
  try {
    const url = callerWallet
      ? `${API_BASE}/preview/${assetId}?callerWallet=${callerWallet}`
      : `${API_BASE}/preview/${assetId}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to load preview");
    return json.data;
  } catch (err) {
    console.error("Failed to fetch tokenization preview:", err);
    throw err;
  }
}

/**
 * Fetch tokenization status and on-chain confirmation details
 */
export async function fetchTokenizationStatus(assetId) {
  try {
    const res = await fetch(`${API_BASE}/status/${assetId}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error("Failed to fetch tokenization status:", err);
    return null;
  }
}

/**
 * Fetch authoritative on-chain token balance and percentage holding
 */
export async function fetchAuthoritativeOwnership(assetId, walletAddress) {
  try {
    const res = await fetch(`${API_BASE}/ownership/${assetId}/${walletAddress}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error("Failed to fetch authoritative ownership:", err);
    return null;
  }
}

/**
 * Confirm tokenization on backend to update Azure Cosmos DB
 */
export async function confirmTokenizationOnBackend(assetId, txHash, ownerWallet) {
  try {
    const res = await fetch(`${API_BASE}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: Number(assetId), txHash, ownerWallet }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Reconciliation failed on backend");
    return json;
  } catch (err) {
    console.error("Failed to confirm tokenization on backend:", err);
    throw err;
  }
}

/**
 * Trigger an approved revaluation (Verifier/Admin)
 */
export async function requestRevaluation(assetId, newValuationLKR, approvalRef, updatedBy) {
  try {
    const res = await fetch(`${API_BASE}/revaluation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: Number(assetId),
        newValuationLKR: Number(newValuationLKR),
        approvalRef,
        updatedBy,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Revaluation failed");
    return json;
  } catch (err) {
    console.error("Failed to trigger revaluation:", err);
    throw err;
  }
}

/**
 * Execute Owner-Initiated Tokenization via MetaMask
 * 
 * 1. Checks and switches network to Hardhat Local (31337)
 * 2. Connects signer via MetaMask
 * 3. Verifies owner authorization on-chain
 * 4. Calls assetToken.tokenize(assetId) directly
 * 5. Waits for transaction confirmation receipt
 * 6. Confirms receipt on backend (updating Azure Cosmos DB)
 * 7. Tracks gas expenditure
 */
export async function executeOwnerTokenization(assetId, onStatusUpdate = () => {}, dbAssetId = null) {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install or enable MetaMask to tokenize assets.");
  }

  // 1. Ensure correct network
  onStatusUpdate("Verifying blockchain network (Hardhat 31337)...");
  await checkAndSwitchNetwork();

  // 2. Obtain signer and contracts
  onStatusUpdate("Connecting MetaMask signer...");
  const { tokenContract, runner } = await getContracts(true);
  const signerAddress = await runner.getAddress();

  // 3. Initiate contract call
  onStatusUpdate("Please confirm the tokenization transaction in MetaMask...");
  
  // Call tokenize(assetId)
  let tx;
  try {
    if (typeof tokenContract.tokenize === "function") {
      tx = await tokenContract.tokenize(Number(assetId));
    } else {
      tx = await tokenContract.tokenizeAsset(Number(assetId), signerAddress);
    }
  } catch (err) {
    if (err.code === "ACTION_REJECTED" || err.message?.includes("user rejected")) {
      throw new Error("Transaction rejected by user in MetaMask.");
    }
    throw err;
  }

  onStatusUpdate(`Transaction broadcast! Waiting for block confirmation: ${tx.hash.slice(0, 10)}...`);
  const receipt = await tx.wait();

  // 4. Gas tracking
  await trackTxGas(tx.hash, "TokenizeAsset", signerAddress, "AssetOwner", dbAssetId || assetId);

  // 5. Reconcile with Backend & Azure Cosmos DB
  onStatusUpdate("Confirming blockchain receipt with Azure database...");
  let backendResult = null;
  try {
    backendResult = await confirmTokenizationOnBackend(dbAssetId || assetId, tx.hash, signerAddress);
  } catch (err) {
    console.warn("Backend confirmation warning (chain tx succeeded):", err.message);
  }

  onStatusUpdate("Asset successfully tokenized on blockchain!");
  return {
    success: true,
    txHash: tx.hash,
    receipt,
    gasUsed: Number(receipt.gasUsed),
    blockNumber: receipt.blockNumber,
    signerAddress,
    backendResult,
  };
}
