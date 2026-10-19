import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Navbar from "../components/Navbar";
import { getContracts, getPaymentTokenBalance, trackTxGas } from "../services/contractService";
import { useCurrency } from "../context/CurrencyContext";
import {
  Coins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  Gift,
  Flame
} from "lucide-react";

export default function ProfitClaims() {
  const { currency, formatMUSD } = useCurrency();
  const [account, setAccount] = useState("");
  const [rounds, setRounds] = useState([]);
  const [userClaims, setUserClaims] = useState({});
  const [loading, setLoading] = useState(true);

  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      let userAddr = "";
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          userAddr = accounts[0];
          setAccount(userAddr);
        }
      }

      // Fetch active rounds
      const res = await fetch("http://localhost:5001/api/distribution/rounds");
      const data = await res.json();
      if (data.success) {
        setRounds(data.data);

        // Fetch proofs for each round if account connected
        if (userAddr) {
          const claimsMap = {};
          for (const r of data.data) {
            try {
              const proofRes = await fetch(
                `http://localhost:5001/api/distribution/claim-proof/${r.roundId}/${userAddr}`
              );
              const pData = await proofRes.json();
              if (pData.success) {
                claimsMap[r.roundId] = pData.data;
              }
            } catch (e) {
              // Not eligible or not found
            }
          }
          setUserClaims(claimsMap);
        }
      }
    } catch (err) {
      console.error("Init error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (roundId) => {
    const claimData = userClaims[roundId];
    if (!claimData) return;

    try {
      setClaiming(true);
      setErrorMsg("");
      setClaimSuccess(null);

      const { distributionContract, runner } = await getContracts(true);
      const signerAddr = await runner.getAddress();

      const tx = await distributionContract.claimProfit(
        claimData.roundId,
        BigInt(claimData.payoutUnits),
        claimData.merkleProof
      );
      const receipt = await tx.wait();

      setClaimSuccess({
        roundId,
        amount: claimData.payoutAmountFormatted,
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString()
      });

      // Track gas
      await trackTxGas(receipt.hash, "ProfitClaim", signerAddr, "Investor", claimData.assetId);

      // Mark claimed in backend
      await fetch("http://localhost:5001/api/distribution/mark-claimed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId: claimData.roundId,
          walletAddress: signerAddr,
          txHash: receipt.hash
        })
      });

      // Update state
      setUserClaims((prev) => ({
        ...prev,
        [roundId]: { ...prev[roundId], isClaimed: true }
      }));
    } catch (err) {
      console.error("Claim error:", err);
      setErrorMsg(err.reason || err.message || "Claim transaction failed");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Gift className="w-8 h-8 text-blue-500" />
            Investor Dividend Claims
          </h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">
            Claim approved, time-weighted rental dividends using zero-knowledge Merkle inclusion proofs.
          </p>
        </div>

        {/* Success Alert */}
        {claimSuccess && (
          <div className="mb-8 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-4 text-sm text-emerald-300">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-white">Dividend Successfully Claimed!</h4>
              <p>
                Transferred {claimSuccess.amount} mUSD directly to your wallet.
              </p>
              <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
                <span>Tx: {claimSuccess.txHash.slice(0, 10)}...{claimSuccess.txHash.slice(-8)}</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Flame className="w-3.5 h-3.5" /> Gas Used: {claimSuccess.gasUsed}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-sm text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Rounds List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
            Loading distribution rounds and Merkle proofs...
          </div>
        ) : rounds.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <Coins className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-zinc-300">No active distribution rounds</h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
              Dividend rounds published by the platform will appear here for one-click claim.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {rounds.map((round) => {
              const claim = userClaims[round.roundId];
              const isEligible = Boolean(claim);
              const isClaimed = claim?.isClaimed;

              return (
                <div
                  key={round.roundId}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 hover:border-zinc-700 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold">
                        Round #{round.roundId}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {round.periodLabel}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          round.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {round.status}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white">
                      Colombo Oceanfront Residence — Rental Yield
                    </h3>

                    <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                      <span>
                        Total Pool: <strong className="text-white">{round.totalPayoutFormatted.toLocaleString()} mUSD</strong>
                        {currency !== "USD" && <span className="ml-1 text-zinc-400 font-mono">(≈ {formatMUSD(round.totalPayoutFormatted)})</span>}
                      </span>
                      <span>Merkle Root: <strong className="text-zinc-300 font-mono">{round.merkleRoot.slice(0, 10)}...{round.merkleRoot.slice(-6)}</strong></span>
                      <span>Eligible Investors: <strong className="text-white">{round.eligibleHoldersCount}</strong></span>
                    </div>
                  </div>

                  {/* Claim Status Card */}
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 md:w-80 shrink-0 text-right">
                    <span className="text-xs text-zinc-400 block mb-1">Your Entitlement</span>
                    {isEligible ? (
                      <div>
                        <div className="text-2xl font-black text-emerald-400">
                          {claim.payoutAmountFormatted.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                          <span className="text-sm font-normal text-zinc-400">mUSD</span>
                        </div>
                        {currency !== "USD" ? (
                          <div className="text-xs text-emerald-400/80 font-mono mb-3">
                            ≈ {formatMUSD(claim.payoutAmountFormatted)}
                          </div>
                        ) : (
                          <div className="mb-3" />
                        )}

                        {isClaimed ? (
                          <div className="w-full py-2 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Claimed on-chain
                          </div>
                        ) : round.status === "Active" ? (
                          <button
                            onClick={() => handleClaim(round.roundId)}
                            disabled={claiming}
                            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Gift className="w-4 h-4" />
                            {claiming ? "Submitting Proof..." : "Claim Dividend"}
                          </button>
                        ) : (
                          <div className="w-full py-2 bg-zinc-800 text-zinc-500 text-xs rounded-xl text-center">
                            Round {round.status}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 text-xs text-zinc-500">
                        No dividend entitlement in this period for connected wallet.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
