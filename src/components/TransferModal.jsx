import React, { useState } from "react";
import { X, ArrowRightLeft, Coins, AlertCircle, CheckCircle2, User, Wallet, Sparkles } from "lucide-react";
import { transferFractionalTokens } from "../services/contractService";

export default function TransferModal({
  asset,
  userBalance,
  wallet,
  onClose,
  onSuccess
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState(null);
  const [txSuccessHash, setTxSuccessHash] = useState(null);

  const currentShares = userBalance || 0;
  const numAmount = Number(amount) || 0;
  const remainingShares = Math.max(0, currentShares - numAmount);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) {
      setError("Please provide a recipient address and amount.");
      return;
    }

    if (numAmount <= 0 || numAmount > currentShares) {
      setError(`Transfer amount must be between 1 and ${currentShares} shares.`);
      return;
    }

    try {
      setIsTransferring(true);
      setError(null);

      const receipt = await transferFractionalTokens(recipient.trim(), asset.assetId, numAmount);
      setTxSuccessHash(receipt.hash);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.reason || err.message || "Transfer transaction failed in MetaMask.");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              Transfer Fractional Shares
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Send your ownership tokens to another investor's wallet
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleTransfer} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {txSuccessHash && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold">Transfer Confirmed On Blockchain!</p>
                <p className="text-[10px] font-mono opacity-80 truncate max-w-xs">{txSuccessHash}</p>
              </div>
            </div>
          )}

          {/* Connected Account & Available Holdings Banner */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                Connected Wallet:
              </span>
              <span className="font-mono text-slate-300 font-medium">
                {wallet?.account ? `${wallet.account.slice(0, 6)}...${wallet.account.slice(-4)}` : "None"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Account ETH Balance:</span>
              <span className="font-bold text-slate-200">
                {parseFloat(wallet?.balance || "0").toFixed(2)} ETH
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Your Property Holdings:</span>
              <span className="text-sm font-bold text-indigo-300 flex items-center gap-1">
                <Coins className="w-4 h-4 text-indigo-400" />
                {currentShares} Shares ({asset.totalShares > 0 ? ((currentShares / asset.totalShares) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Recipient Wallet Address
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Number of Shares to Transfer
              </label>
              <button
                type="button"
                onClick={() => setAmount(String(currentShares))}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Send All ({currentShares})
              </button>
            </div>
            <input
              type="number"
              required
              min="1"
              max={currentShares}
              placeholder="e.g. 100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Dynamic Balance Reduction Live Preview */}
          {numAmount > 0 && (
            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span>Transfer Amount:</span>
                <span className="font-bold text-amber-400">-{numAmount} Shares</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-indigo-900/50">
                <span>Your Remaining Balance After Transfer:</span>
                <span className={`font-bold ${remainingShares > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                  {remainingShares} Shares ({asset.totalShares > 0 ? ((remainingShares / asset.totalShares) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Transferred Financial Equity:</span>
                <span className="font-medium text-slate-200">
                  LKR {Math.round((numAmount / asset.totalShares) * asset.valuationLKR).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isTransferring || currentShares === 0}
              className="w-full py-3.5 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-lg shadow-[#4F46E5]/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTransferring ? "Executing Transfer on Blockchain..." : "Confirm & Transfer Shares"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
