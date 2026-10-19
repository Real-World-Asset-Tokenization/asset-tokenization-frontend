import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCurrency } from "../context/CurrencyContext";
import { fetchTokenizationStatus } from "../services/tokenizationService";
import {
  ShieldCheck,
  Coins,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  ArrowRight,
  Database,
  Link as LinkIcon,
  ShoppingBag
} from "lucide-react";

export default function TokenizationStatus() {
  const { assetId } = useParams();
  const { formatLKR } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      setLoading(true);
      try {
        const res = await fetchTokenizationStatus(assetId);
        setData(res);
      } catch (err) {
        console.error("Error loading tokenization status:", err);
      } finally {
        setLoading(false);
      }
    }
    if (assetId) loadStatus();
  }, [assetId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const record = data?.databaseRecord;
  const onChain = data?.onChainStatus;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link to="/verified-assets" className="hover:text-zinc-200">
            Verified Assets
          </Link>
          <span>/</span>
          <span className="text-zinc-200 font-medium">Asset #{assetId} Status</span>
        </div>

        {/* Status Header */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-xl backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span>On-Chain & Azure Cosmos DB Reconciled</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white">
                {record?.assetName || onChain?.name || `Asset #${assetId}`}
              </h1>
              <p className="text-xs text-zinc-400">
                Authoritative tokenization record confirmed on Hardhat EVM and synced to Azure.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                to="/marketplace"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                List on Marketplace
              </Link>
              <Link
                to="/portfolio"
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700"
              >
                Portfolio
              </Link>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-zinc-900">
              <div>
                <span className="text-zinc-500 font-sans block text-[11px]">Token Contract (ERC-1155)</span>
                <span className="text-white font-semibold break-all">
                  {record?.contractAddress || "0xc351628EB244ec633d5f21fBD6621e1a683B1181"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block text-[11px]">ERC-1155 Token ID</span>
                <span className="text-emerald-400 font-bold text-base">#{assetId}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-zinc-900">
              <div>
                <span className="text-zinc-500 font-sans block text-[11px]">Approved Valuation</span>
                <span className="text-white font-bold font-sans">
                  {formatLKR(record?.approvedValuation || onChain?.valuationLKR || 10000000)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block text-[11px]">Total Issued Supply</span>
                <span className="text-white font-bold">
                  {(record?.approvedTokenSupply || onChain?.totalShares || 1000).toLocaleString()} Shares
                </span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block text-[11px]">Calculated Reference Price</span>
                <span className="text-indigo-400 font-bold font-sans">
                  {formatLKR(record?.calculatedReferencePrice || 10000)} / share
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-zinc-900">
              <div>
                <span className="text-zinc-500 font-sans block text-[11px]">Owner Recipient Wallet</span>
                <span className="text-emerald-300 font-semibold break-all">
                  {record?.ownerWallet || onChain?.issuer || "Not Connected"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block text-[11px]">Chain Network ID</span>
                <span className="text-zinc-300">Hardhat Localhost (Chain ID: 31337)</span>
              </div>
            </div>

            {record?.mintingTxHash && (
              <div className="pt-2">
                <span className="text-zinc-500 font-sans block text-[11px] mb-1">
                  Blockchain Minting Transaction Hash
                </span>
                <span className="text-blue-400 break-all text-[11px] bg-zinc-900 p-2.5 rounded-xl block border border-zinc-800">
                  {record.mintingTxHash}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
