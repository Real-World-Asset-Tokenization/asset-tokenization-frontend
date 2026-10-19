import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Navbar from "../components/Navbar";
import { getContracts, getPaymentTokenBalance, trackTxGas } from "../services/contractService";
import { useCurrency } from "../context/CurrencyContext";
import {
  ShoppingBag,
  PlusCircle,
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ArrowUpRight
} from "lucide-react";

export default function Marketplace() {
  const { currency, formatMUSD } = useCurrency();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState("");
  const [mUsdBal, setMUsdBal] = useState(0);

  // Buy modal
  const [selectedListing, setSelectedListing] = useState(null);
  const [buying, setBuying] = useState(false);
  const [buyStep, setBuyStep] = useState(""); // "approving" | "purchasing" | "done"
  const [txHash, setTxHash] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Create listing modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assetId, setAssetId] = useState(1);
  const [sellAmount, setSellAmount] = useState(10);
  const [sellPrice, setSellPrice] = useState(100);
  const [durationDays, setDurationDays] = useState(30);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    initWallet();
    fetchListings();

    if (window.ethereum) {
      const handleAccounts = async (accounts) => {
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          try {
            const bal = await getPaymentTokenBalance(accounts[0]);
            setMUsdBal(bal);
          } catch (e) {
            setMUsdBal(0);
          }
        } else {
          setAccount("");
          setMUsdBal(0);
        }
      };
      window.ethereum.on("accountsChanged", handleAccounts);
      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccounts);
        }
      };
    }
  }, []);

  const initWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const bal = await getPaymentTokenBalance(accounts[0]);
        setMUsdBal(bal);
      }
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/api/marketplace/listings");
      const data = await res.json();
      if (data.success) {
        setListings(data.data);
      }
    } catch (err) {
      console.error("Failed to load listings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listing) => {
    try {
      setErrorMsg("");
      setBuying(true);
      setBuyStep("approving");

      const { tokenMarketplaceContract, paymentTokenContract, addrs, runner } = await getContracts(true);
      const signerAddr = await runner.getAddress();

      const totalPriceUnits = BigInt(listing.pricePerTokenBase) * BigInt(listing.amount);

      // Check allowance
      const currentAllowance = await paymentTokenContract.allowance(
        signerAddr,
        addrs.tokenMarketplaceAddress
      );

      if (currentAllowance < totalPriceUnits) {
        const approveTx = await paymentTokenContract.approve(
          addrs.tokenMarketplaceAddress,
          totalPriceUnits
        );
        await approveTx.wait();
      }

      setBuyStep("purchasing");
      const buyTx = await tokenMarketplaceContract.buyListing(listing.listingId);
      const receipt = await buyTx.wait();

      setTxHash(receipt.hash);
      setBuyStep("done");

      // Track gas
      await trackTxGas(receipt.hash, "MarketplacePurchase", signerAddr, "Investor", listing.assetId);

      // Refresh listings
      fetchListings();
      const updatedBal = await getPaymentTokenBalance(signerAddr);
      setMUsdBal(updatedBal);
    } catch (err) {
      console.error("Buy error:", err);
      setErrorMsg(err.reason || err.message || "Purchase failed");
      setBuyStep("");
    } finally {
      setBuying(false);
    }
  };

  const handleSwitchWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          const bal = await getPaymentTokenBalance(accounts[0]);
          setMUsdBal(bal);
        }
      }
    } catch (err) {
      console.warn("Wallet switch request error:", err.message);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setErrorMsg("");

      const { tokenMarketplaceContract, tokenContract, addrs, runner } = await getContracts(true);
      const signerAddr = await runner.getAddress();

      // Ensure marketplace is approved for ERC-1155 tokens
      const isApproved = await tokenContract.isApprovedForAll(
        signerAddr,
        addrs.tokenMarketplaceAddress
      );

      if (!isApproved) {
        const appTx = await tokenContract.setApprovalForAll(
          addrs.tokenMarketplaceAddress,
          true
        );
        await appTx.wait();
      }

      const priceBaseUnits = ethers.parseUnits(sellPrice.toString(), 6);
      const durationSeconds = durationDays * 86400;

      const tx = await tokenMarketplaceContract.createListing(
        assetId,
        sellAmount,
        priceBaseUnits,
        addrs.paymentTokenAddress,
        durationSeconds
      );
      const receipt = await tx.wait();

      await trackTxGas(receipt.hash, "MarketplaceListing", signerAddr, "Investor", assetId);

      setShowCreateModal(false);
      fetchListings();
    } catch (err) {
      console.error("Create listing error:", err);
      setErrorMsg(err.reason || err.message || "Failed to create listing");
    } finally {
      setCreating(false);
    }
  };

  const handleCancelListing = async (listingId) => {
    try {
      const { tokenMarketplaceContract } = await getContracts(true);
      const tx = await tokenMarketplaceContract.cancelListing(listingId);
      await tx.wait();
      fetchListings();
    } catch (err) {
      alert("Cancellation failed: " + (err.reason || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-blue-500" />
              Token Marketplace
            </h1>
            <p className="text-zinc-400 mt-1 text-sm sm:text-base">
              Non-custodial, peer-to-peer trading of fractional real-world asset tokens with atomic ERC-20 settlement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              List Tokens for Sale
            </button>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
            Loading marketplace orders...
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-zinc-300">No active listings available</h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
              Be the first investor to list fractional shares on the secondary marketplace.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => {
              const isSeller = account && item.seller.toLowerCase() === account.toLowerCase();
              const isExpired = item.expiresAt > 0 && item.expiresAt < Date.now() / 1000;
              const totalPrice = item.amount * item.pricePerTokenFormatted;
              const platformFee = (totalPrice * 0.01).toFixed(2);

              return (
                <div
                  key={item.listingId}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Tag & Status */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold">
                        Asset #{item.assetId} — {item.assetName || "Real Estate Asset"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 0
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : item.status === 1
                            ? "bg-zinc-800 text-zinc-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {item.statusLabel}
                      </span>
                    </div>

                    {/* Listing Title */}
                    <h3 className="text-xl font-bold text-white mb-2">
                      {item.amount.toLocaleString()} Fractional Shares
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono mb-4">
                      Seller: {item.seller.slice(0, 8)}...{item.seller.slice(-6)}
                      {isSeller && <span className="ml-2 text-blue-400 font-sans font-medium">(You)</span>}
                    </p>

                    {/* Pricing Box */}
                    <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 mb-4 space-y-2 text-sm">
                      <div className="flex justify-between text-zinc-400">
                        <span>Price per token:</span>
                        <div className="text-right">
                          <span className="font-semibold text-white">{item.pricePerTokenFormatted} mUSD</span>
                          {currency !== "USD" && (
                            <span className="block text-[11px] text-zinc-400 font-mono">
                              ≈ {formatMUSD(item.pricePerTokenFormatted)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Platform fee (1%):</span>
                        <span className="text-zinc-300">{platformFee} mUSD</span>
                      </div>
                      <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-white items-baseline">
                        <span>Total Cost:</span>
                        <div className="text-right">
                          <span className="text-emerald-400 text-base">{totalPrice.toLocaleString()} mUSD</span>
                          {currency !== "USD" && (
                            <span className="block text-xs text-emerald-400/80 font-normal font-mono">
                              ≈ {formatMUSD(totalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2">
                    {item.status === 0 && !isExpired && (
                      isSeller ? (
                        <div className="space-y-2">
                          <div className="text-[11px] text-zinc-400 bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800 text-center space-y-1">
                            <span className="text-zinc-300">You are the seller of this listing.</span>
                            <div className="text-xs">
                              <button
                                onClick={handleSwitchWallet}
                                className="text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer"
                              >
                                Switch to Buyer / Investor Account →
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelListing(item.listingId)}
                            className="w-full py-2 bg-zinc-800/80 hover:bg-zinc-700 text-rose-400 border border-zinc-700 font-medium text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Cancel Listing
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedListing(item);
                            handleBuy(item);
                          }}
                          disabled={buying}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Coins className="w-4 h-4" />
                          Buy with mUSD
                        </button>
                      )
                    )}

                    {item.status === 1 && (
                      <div className="text-center py-2 text-xs text-zinc-500 font-medium">
                        ✓ Completed & Settled Atomically
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Buy Flow Modal / Status Overlay */}
        {selectedListing && buying && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                <Coins className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white">Processing Purchase</h3>
              <p className="text-xs text-zinc-400">
                Purchasing {selectedListing.amount} tokens for {(selectedListing.amount * selectedListing.pricePerTokenFormatted).toLocaleString()} mUSD
              </p>

              <div className="space-y-2 text-left bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <div className={`w-2 h-2 rounded-full ${buyStep === "approving" ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`}></div>
                  1. Approve mUSD Payment Tokens
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <div className={`w-2 h-2 rounded-full ${buyStep === "purchasing" ? "bg-amber-400 animate-ping" : buyStep === "done" ? "bg-emerald-400" : "bg-zinc-600"}`}></div>
                  2. Settle Token & Payment Swap Atomically
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              {buyStep === "done" && (
                <button
                  onClick={() => setSelectedListing(null)}
                  className="w-full py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}

        {/* Create Listing Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-2">Create Non-Custodial Listing</h2>
              <p className="text-xs text-zinc-400 mb-6">
                Your fractional shares remain in your wallet until a buyer completes the atomic purchase.
              </p>

              <form onSubmit={handleCreateListing} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Select Tokenized Asset
                  </label>
                  <select
                    value={assetId}
                    onChange={(e) => setAssetId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>Asset #1: Colombo Oceanfront Residence (1,000 Total Shares)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Token Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Price per Token (mUSD)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Listing Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Summary Box */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs space-y-1.5 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Gross Proceeds:</span>
                    <span className="font-semibold text-white">{(sellAmount * sellPrice).toLocaleString()} mUSD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Trading Fee (1%):</span>
                    <span className="text-zinc-300">{(sellAmount * sellPrice * 0.01).toFixed(2)} mUSD</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-zinc-800 pt-1.5 items-baseline">
                    <span>Net Expected to Seller:</span>
                    <div className="text-right">
                      <span className="text-emerald-400">{(sellAmount * sellPrice * 0.99).toFixed(2)} mUSD</span>
                      {currency !== "USD" && (
                        <span className="block text-[11px] text-zinc-400 font-mono font-normal">
                          ≈ {formatMUSD(sellAmount * sellPrice * 0.99)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {creating ? "Submitting Listing..." : "Confirm & List"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
