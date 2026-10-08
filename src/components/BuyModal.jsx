import React, { useState, useEffect } from "react";
import {
  X,
  ShoppingCart,
  Coins,
  Wallet,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  RefreshCw,
  Repeat,
  Sparkles
} from "lucide-react";
import { ethers } from "ethers";
import { buySharesApi, swapTokensApi, fetchAvailableSupply } from "../services/apiService";
import { getBrowserProvider, transferFractionalTokens } from "../services/contractService";

export default function BuyModal({
  asset,
  userBalance,
  wallet,
  allAssets = [],
  userBalances = {},
  onClose,
  onSuccess
}) {
  const [activeTab, setActiveTab] = useState("ETH"); // "ETH" or "TOKEN_SWAP"
  const [amount, setAmount] = useState("50");
  const [availableSupply, setAvailableSupply] = useState(asset.totalShares || 1000);
  const [isBuying, setIsBuying] = useState(false);
  const [error, setError] = useState(null);
  const [txSuccess, setTxSuccess] = useState(null);

  // Available tokenized properties the user holds tokens for (excluding the current asset)
  const holdingsWithTokens = allAssets.filter(
    (a) => a.assetId !== asset.assetId && (userBalances[a.assetId] || 0) > 0
  );

  const [selectedSourceId, setSelectedSourceId] = useState(
    holdingsWithTokens.length > 0 ? holdingsWithTokens[0].assetId : ""
  );
  const [swapSourceAmount, setSwapSourceAmount] = useState("10");

  const ethPricePerShare = 0.001; // 0.001 ETH per fractional share

  useEffect(() => {
    fetchAvailableSupply(asset.assetId).then((avail) => {
      if (avail > 0) setAvailableSupply(avail);
    });
  }, [asset.assetId]);

  // Tab 1 (Buy with ETH) Calculations
  const numAmount = Number(amount) || 0;
  const totalEthCost = (numAmount * ethPricePerShare).toFixed(4);
  const userEthBalance = parseFloat(wallet?.balance || "0");
  const remainingEth = (userEthBalance - parseFloat(totalEthCost)).toFixed(3);
  const newShareBalance = (userBalance || 0) + numAmount;
  const remainingSupply = Math.max(0, availableSupply - numAmount);

  // Tab 2 (Buy Land with Property Tokens) Calculations
  const sourceAsset = allAssets.find((a) => a.assetId === Number(selectedSourceId));
  const userSourceTokens = sourceAsset ? (userBalances[sourceAsset.assetId] || 0) : 0;
  const numSwapSource = Number(swapSourceAmount) || 0;

  const srcPrice = sourceAsset
    ? (sourceAsset.sharePriceLKR || (sourceAsset.valuationLKR / sourceAsset.totalShares))
    : 10000;
  const tgtPrice = asset.sharePriceLKR || (asset.valuationLKR / asset.totalShares);

  const totalExchangedLKR = numSwapSource * srcPrice;
  const targetSharesReceived = Math.max(1, Math.floor(totalExchangedLKR / tgtPrice));
  const remainingSourceTokens = Math.max(0, userSourceTokens - numSwapSource);
  const newTargetBalanceFromSwap = (userBalance || 0) + targetSharesReceived;

  // Handle Buy With ETH
  const handleBuyWithEth = async (e) => {
    e.preventDefault();
    if (!wallet.account) {
      setError("Please connect your MetaMask wallet first.");
      return;
    }

    if (numAmount <= 0) {
      setError("Please enter a valid amount of shares to purchase.");
      return;
    }

    if (numAmount > availableSupply) {
      setError(`Only ${availableSupply} shares available for purchase.`);
      return;
    }

    if (parseFloat(totalEthCost) > userEthBalance) {
      setError(`Insufficient ETH balance. You need ${totalEthCost} ETH, but have ${userEthBalance.toFixed(2)} ETH.`);
      return;
    }

    try {
      setIsBuying(true);
      setError(null);

      // Send ETH payment to treasury
      const provider = await getBrowserProvider();
      const signer = await provider.getSigner();
      const treasuryAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const paymentTx = await signer.sendTransaction({
        to: treasuryAddress,
        value: ethers.parseEther(totalEthCost)
      });
      await paymentTx.wait();

      // Platform mints/transfers fractional shares to buyer
      const buyRes = await buySharesApi(asset.assetId, wallet.account, numAmount, paymentTx.hash);
      setTxSuccess({
        message: `Successfully purchased ${numAmount} shares of ${asset.name}!`,
        deducted: `-${totalEthCost} ETH`,
        received: `+${numAmount} Shares (${asset.symbol})`,
        txHash: buyRes.txHash
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setError(err.reason || err.message || "Purchase transaction failed in MetaMask.");
    } finally {
      setIsBuying(false);
    }
  };

  // Handle Buy Land with Existing Property Tokens (Cross-Property Token Swap)
  const handleBuyWithTokens = async (e) => {
    e.preventDefault();
    if (!wallet.account) {
      setError("Please connect your MetaMask wallet first.");
      return;
    }

    if (!sourceAsset) {
      setError("Please select a property token to exchange.");
      return;
    }

    if (numSwapSource <= 0 || numSwapSource > userSourceTokens) {
      setError(`Please specify between 1 and ${userSourceTokens} ${sourceAsset.symbol} tokens to exchange.`);
      return;
    }

    try {
      setIsBuying(true);
      setError(null);

      // 1. Transfer user's source tokens to treasury via MetaMask
      const treasuryAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const transferReceipt = await transferFractionalTokens(
        treasuryAddress,
        sourceAsset.assetId,
        numSwapSource
      );

      // 2. Platform executes the atomic exchange and delivers target land shares
      const swapRes = await swapTokensApi({
        userAddress: wallet.account,
        sourceAssetId: sourceAsset.assetId,
        targetAssetId: asset.assetId,
        sourceAmount: numSwapSource,
        transferTxHash: transferReceipt.hash
      });

      setTxSuccess({
        message: `Cross-Property Token Swap confirmed on blockchain!`,
        deducted: `-${numSwapSource} ${sourceAsset.symbol} Tokens`,
        received: `+${targetSharesReceived} ${asset.symbol} Shares`,
        txHash: swapRes.txHash
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setError(err.reason || err.message || "Cross-asset token exchange failed.");
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              Acquire Shares in {asset.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Buy with test ETH or exchange tokens from another property
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Purchase Mode Tabs */}
        <div className="grid grid-cols-2 p-2 bg-[#090D22] border-b border-[#94A3BB]/15 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("ETH")}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "ETH"
                ? "bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/40"
                : "text-[#94A3BB] hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>Pay with ETH</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TOKEN_SWAP")}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "TOKEN_SWAP"
                ? "bg-[#00E5FF] text-[#050816] font-bold shadow-md shadow-[#00E5FF]/40"
                : "text-[#94A3BB] hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Buy Land with Tokens</span>
          </button>
        </div>

        {/* Tab 1: Pay with ETH */}
        {activeTab === "ETH" && (
          <form onSubmit={handleBuyWithEth} className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {txSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold">{txSuccess.message}</p>
                  <p className="text-[11px] font-mono opacity-90">{txSuccess.deducted} • {txSuccess.received}</p>
                </div>
              </div>
            )}

            {/* Account & Available Market Supply Banner */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                  Your Account ETH:
                </span>
                <span className="font-bold text-slate-100">
                  {userEthBalance.toFixed(2)} ETH
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Available Market Supply:</span>
                <span className="font-bold text-emerald-400">
                  {availableSupply} Shares Available
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Current Holdings in Property:</span>
                <span className="text-sm font-bold text-indigo-300 flex items-center gap-1">
                  <Coins className="w-4 h-4 text-indigo-400" />
                  {userBalance || 0} Shares
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Shares to Purchase
                </label>
                <span className="text-[11px] text-slate-400">
                  1 Share = {ethPricePerShare} ETH (0.1% of property)
                </span>
              </div>
              <input
                type="number"
                required
                min="1"
                max={availableSupply}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Real-Time Balance Reduction Preview */}
            {numAmount > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1 text-red-300">
                    <TrendingDown className="w-3.5 h-3.5" />
                    ETH to Spend:
                  </span>
                  <span className="font-bold text-red-400">-{totalEthCost} ETH</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Your New Shares:
                  </span>
                  <span className="font-bold text-emerald-400">
                    {newShareBalance} Shares (+{numAmount})
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-emerald-900/40 text-[11px]">
                  <span>Your Remaining ETH After Purchase:</span>
                  <span className="font-semibold text-slate-200">{remainingEth} ETH</span>
                </div>

                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Market Supply Remaining:</span>
                  <span className="font-semibold text-slate-200">{remainingSupply} Shares</span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isBuying || availableSupply === 0}
                className="w-full py-3.5 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-lg shadow-[#4F46E5]/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {isBuying ? "Processing Purchase in MetaMask..." : `Buy ${numAmount} Shares for ${totalEthCost} ETH`}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Buy Land with Property Tokens (Cross-Asset Exchange) */}
        {activeTab === "TOKEN_SWAP" && (
          <form onSubmit={handleBuyWithTokens} className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {txSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold">{txSuccess.message}</p>
                  <p className="text-[11px] font-mono opacity-90">{txSuccess.deducted} ➔ {txSuccess.received}</p>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-1">
              <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Cross-Property Token Liquidity
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Use fractional tokens you own in another property to acquire shares in <strong>{asset.name}</strong> without spending additional cash or ETH.
              </p>
            </div>

            {/* Source Property Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Source Property Tokens to Spend
              </label>
              {holdingsWithTokens.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900 border border-amber-900/60 text-amber-300 text-xs">
                  You currently don't hold tokens in other properties. Acquire or claim tokens first, or register your own property to mint initial shares!
                </div>
              ) : (
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  {holdingsWithTokens.map((p) => (
                    <option key={p.assetId} value={p.assetId}>
                      {p.name} ({p.symbol}) — You own: {userBalances[p.assetId] || 0} tokens
                    </option>
                  ))}
                </select>
              )}
            </div>

            {sourceAsset && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Amount of {sourceAsset.symbol} Tokens to Spend
                  </label>
                  <button
                    type="button"
                    onClick={() => setSwapSourceAmount(String(userSourceTokens))}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    Spend Max ({userSourceTokens})
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max={userSourceTokens || 1}
                  value={swapSourceAmount}
                  onChange={(e) => setSwapSourceAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Live Cross-Asset Swap Reductions & Acquisitions Preview */}
            {sourceAsset && numSwapSource > 0 && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-red-400 font-medium flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Spent Tokens (Source):
                  </span>
                  <span className="font-bold text-red-400">
                    -{numSwapSource} {sourceAsset.symbol} Tokens
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Land Shares Acquired (Target):
                  </span>
                  <span className="font-bold text-emerald-400">
                    +{targetSharesReceived} {asset.symbol} Shares
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                  <span>Remaining {sourceAsset.symbol} Holdings:</span>
                  <span className="font-medium text-slate-200">{remainingSourceTokens} Tokens</span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Your New {asset.symbol} Holdings:</span>
                  <span className="font-medium text-indigo-300">{newTargetBalanceFromSwap} Shares</span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>Fair-Value Valuation Rate:</span>
                  <span>
                    1 {sourceAsset.symbol} (LKR {srcPrice.toLocaleString()}) = {(srcPrice / tgtPrice).toFixed(2)} {asset.symbol}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isBuying || !sourceAsset || userSourceTokens === 0 || numSwapSource <= 0}
                className="w-full py-3.5 rounded-2xl bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#050816] font-extrabold text-sm shadow-lg shadow-[#00E5FF]/35 transition-all cursor-pointer disabled:opacity-50"
              >
                {isBuying
                  ? "Executing Cross-Property Token Swap..."
                  : `Exchange ${numSwapSource} ${sourceAsset?.symbol || "Tokens"} for ${targetSharesReceived} ${asset.symbol} Shares`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
